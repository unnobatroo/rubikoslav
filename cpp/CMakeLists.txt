set(RUBIKOSLAV_CORE_SOURCES
    src/Cuboslav.cpp
    src/Move.cpp
)

add_library(RubikoslavLibrary ${RUBIKOSLAV_CORE_SOURCES})
add_library(Rubikoslav::Core ALIAS RubikoslavLibrary)

target_compile_features(RubikoslavLibrary PUBLIC cxx_std_20)
target_include_directories(RubikoslavLibrary
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
set_target_properties(RubikoslavLibrary PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    EXPORT_NAME Core
)

if(MSVC)
    target_compile_options(RubikoslavLibrary PRIVATE /W4)
    if(RUBIKOSLAV_WARNINGS_AS_ERRORS)
        target_compile_options(RubikoslavLibrary PRIVATE /WX)
    endif()
else()
    target_compile_options(RubikoslavLibrary PRIVATE -Wall -Wextra -Wpedantic)
    if(RUBIKOSLAV_WARNINGS_AS_ERRORS)
        target_compile_options(RubikoslavLibrary PRIVATE -Werror)
    endif()
endif()

if(NOT SKBUILD)
    install(TARGETS RubikoslavLibrary
            EXPORT RubikoslavTargets
            ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
            LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
            RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
            INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
endif()

if(RUBIKOSLAV_BUILD_PYTHON)
    find_package(Python COMPONENTS Interpreter Development.Module QUIET)
    find_package(pybind11 CONFIG QUIET)

    if(Python_FOUND AND NOT pybind11_FOUND)
        execute_process(
            COMMAND ${Python_EXECUTABLE} -m pybind11 --cmakedir
            RESULT_VARIABLE RUBIKOSLAV_PYBIND11_RESULT
            OUTPUT_VARIABLE RUBIKOSLAV_PYBIND11_CMAKE_DIR
            OUTPUT_STRIP_TRAILING_WHITESPACE
            ERROR_QUIET
        )
        if(RUBIKOSLAV_PYBIND11_RESULT EQUAL 0)
            find_package(pybind11 CONFIG QUIET PATHS "${RUBIKOSLAV_PYBIND11_CMAKE_DIR}")
        endif()
    endif()

    if(Python_FOUND AND pybind11_FOUND)
        pybind11_add_module(CuboslavWrapper src/CuboslavWrapper.cpp)
        target_link_libraries(CuboslavWrapper PRIVATE Rubikoslav::Core)

        if(SKBUILD)
            install(TARGETS CuboslavWrapper
                    LIBRARY DESTINATION rubikoslav
                    RUNTIME DESTINATION rubikoslav)
        endif()
    else()
        message(WARNING
            "Python modules were requested but Python development files or pybind11 "
            "were not found. The C++ library will still be built. Install pybind11 "
            "for ${Python_EXECUTABLE} or configure with -DRUBIKOSLAV_BUILD_PYTHON=OFF.")
    endif()
endif()
