cmake_minimum_required(VERSION 3.26)

project(Rubikoslav VERSION 1.0.2 LANGUAGES CXX)

include(CTest)
include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

set(CMAKE_CXX_EXTENSIONS OFF)

option(RUBIKOSLAV_BUILD_PYTHON "Build the optional pybind11 cube module" ON)
option(RUBIKOSLAV_BUILD_EXAMPLES "Build the supported command-line example" ON)
option(RUBIKOSLAV_BUILD_WEB "Build the web visualizer data generator" ON)
option(RUBIKOSLAV_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)

add_subdirectory(cpp)

if(BUILD_TESTING)
    add_subdirectory(cpp/tests)
endif()

if(RUBIKOSLAV_BUILD_EXAMPLES)
    add_subdirectory(cpp/examples)
endif()

if(RUBIKOSLAV_BUILD_WEB)
    add_subdirectory(web)
endif()

if(SKBUILD)
    install(FILES
            "${CMAKE_SOURCE_DIR}/web/index.html"
            "${CMAKE_SOURCE_DIR}/web/styles.css"
            DESTINATION rubikoslav/web)
    install(DIRECTORY "${CMAKE_SOURCE_DIR}/web/styles/"
            DESTINATION rubikoslav/web/styles
            FILES_MATCHING PATTERN "*.css")
    install(DIRECTORY "${CMAKE_SOURCE_DIR}/web/dist/"
            DESTINATION rubikoslav/web/dist
            FILES_MATCHING PATTERN "*.js")
else()
    install(DIRECTORY cpp/include/Rubikoslav
            DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})

    install(EXPORT RubikoslavTargets
            FILE RubikoslavTargets.cmake
            NAMESPACE Rubikoslav::
            DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Rubikoslav)

    configure_package_config_file(
        cpp/cmake/RubikoslavConfig.cmake.in
        "${CMAKE_CURRENT_BINARY_DIR}/RubikoslavConfig.cmake"
        INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Rubikoslav
    )
    write_basic_package_version_file(
        "${CMAKE_CURRENT_BINARY_DIR}/RubikoslavConfigVersion.cmake"
        VERSION ${PROJECT_VERSION}
        COMPATIBILITY SameMajorVersion
    )
    install(FILES
        "${CMAKE_CURRENT_BINARY_DIR}/RubikoslavConfig.cmake"
        "${CMAKE_CURRENT_BINARY_DIR}/RubikoslavConfigVersion.cmake"
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Rubikoslav
    )
endif()
