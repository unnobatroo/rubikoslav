# C++ API

The native library uses the `rubikoslav` namespace. CMake exports it as the `Rubikoslav::Core` target.

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

Point `CMAKE_PREFIX_PATH` at the installation prefix when it is outside the system search path.

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

Public types such as `Cuboslav`, `Move`, `Hash`, `CubeValidationResult`, and `Stopwatch` live under `rubikoslav` so they do not collide with types from another library.

!!! warning "Internal namespace"
    `rubikoslav::detail` contains lookup tables and generated move constants used by the engine and build tools. Application code should not depend on those names remaining stable.

## C++ package managers

C++ has no single universal equivalent of PyPI. Conan and vcpkg are the closest package registries. Rubikoslav currently provides a standard installable CMake package; a Conan or vcpkg recipe can be added when there is demand from native consumers.
