add_executable(WebDataGeneratorovich
               "${CMAKE_SOURCE_DIR}/cpp/tools/generate_cube_data.cpp")
target_link_libraries(WebDataGeneratorovich PRIVATE Rubikoslav::Core)

add_custom_target(
  generate-web-data
  COMMAND WebDataGeneratorovich
          "${CMAKE_CURRENT_SOURCE_DIR}/src/generated/cube-data.ts"
  DEPENDS WebDataGeneratorovich
  COMMENT "Generating typed browser move data from the C++ cube engine"
  VERBATIM)

if(BUILD_TESTING)
  add_test(NAME WebDataGeneratorovichIsCurrent
           COMMAND WebDataGeneratorovich --check
                   "${CMAKE_CURRENT_SOURCE_DIR}/src/generated/cube-data.ts")
endif()
