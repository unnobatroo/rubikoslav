if(RUBIKOSLAV_BUILD_EXAMPLES)
    add_executable(CuboslavDemo solve_scramble.cpp)
    target_link_libraries(CuboslavDemo PRIVATE Rubikoslav::Core)
endif()
