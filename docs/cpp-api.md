# C++ API

The native library lives under the `rubikoslav` namespace. In CMake, the exported target is `Rubikoslav::Core`.

## Build and install

```bash
cmake -S . -B build/native \
  -DRUBIKOSLAV_BUILD_PYTHON=OFF \
  -DRUBIKOSLAV_BUILD_WEB=OFF
cmake --build build/native --config Release
cmake --install build/native --prefix /your/install/prefix
```

## Link from CMake

```cmake
find_package(Rubikoslav CONFIG REQUIRED)

add_executable(my_cube_app main.cpp)
target_link_libraries(my_cube_app PRIVATE Rubikoslav::Core)
target_compile_features(my_cube_app PRIVATE cxx_std_20)
```

If the install prefix is outside the normal system search path, add it to `CMAKE_PREFIX_PATH`.

## Use the engine

```cpp
#include <Rubikoslav/Cuboslav.hpp>

#include <iostream>

int main() {
  rubikoslav::Cuboslav cube;
  cube.turn(rubikoslav::Move::fromNotation("R"));
  cube.turn(rubikoslav::Move::fromNotation("U"));

  std::cout << (cube.solved() ? "solved" : "scrambled") << '\n';
}
```

Public types such as `Cuboslav`, `Move`, `Hash`, `CubeValidationResult`, and `Stopwatch` stay under `rubikoslav`, which keeps them from colliding with names from another library.

!!! warning "Internal namespace"
    `rubikoslav::detail` contains lookup tables and generated move constants for the engine and build tools. Those names are internal and may change, so application code should not depend on them.

## C++ package managers

C++ does not have one universal equivalent of PyPI; Conan and vcpkg are the closest options. For now, Rubikoslav ships as a standard installable CMake package. A Conan or vcpkg recipe can be added when native users need one.
