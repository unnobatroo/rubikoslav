# C++ API

Most users should install the Python package. The native C++20 library is available for applications that need the cube model without Python.

The public namespace is `rubikoslav`, and the exported CMake target is `Rubikoslav::Core`.

## Build and install

```bash
cmake -S . -B build/native \
  -DRUBIKOSLAV_BUILD_PYTHON=OFF \
  -DRUBIKOSLAV_BUILD_WEB=OFF
cmake --build build/native --config Release
cmake --install build/native --prefix /your/install/prefix
```

## Consume from CMake

```cmake
find_package(Rubikoslav CONFIG REQUIRED)

add_executable(my_cube_app main.cpp)
target_link_libraries(my_cube_app PRIVATE Rubikoslav::Core)
target_compile_features(my_cube_app PRIVATE cxx_std_20)
```

Add a non-standard install prefix to `CMAKE_PREFIX_PATH` when configuring the consuming project.

## Apply moves

```cpp
#include <Rubikoslav/Cuboslav.hpp>

#include <iostream>

int main() {
  rubikoslav::Cuboslav cube;
  cube.turn(rubikoslav::Move::fromNotation("R"));
  cube.turn(rubikoslav::Move::fromNotation("U2"));

  std::cout << (cube.solved() ? "solved" : "not solved") << '\n';
}
```

Public types include `Cuboslav`, `Move`, `Hash`, `CubeValidationResult`, and `Stopwatch`.

!!! warning "Internal namespace"
    `rubikoslav::detail` contains generated move constants and engine implementation details. It is not a compatibility surface.

Rubikoslav currently ships a standard installable CMake package, not Conan or vcpkg recipes.
