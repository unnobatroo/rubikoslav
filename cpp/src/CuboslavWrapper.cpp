
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <array>

#include "Rubikoslav/Cuboslav.hpp"

class CuboslavWrapper {
public:
  void move(const std::string &notation);
  void moveCode(char code);
  void setCube(const std::vector<int> &state);
  std::array<short, 48> getCube() const;

private:
  Cuboslav cube;
};

void CuboslavWrapper::move(const std::string &notation) {
  cube.turn(Move::fromNotation(notation));
}

void CuboslavWrapper::moveCode(const char code) { cube.turn(code); }

void CuboslavWrapper::setCube(const std::vector<int> &state) {
  cube.setState(state);
}

std::array<short, 48> CuboslavWrapper::getCube() const {
  return cube.cube;
}

PYBIND11_MODULE(CuboslavWrapper, m) {
  pybind11::class_<CuboslavWrapper>(m, "CuboslavWrapper")
      .def(pybind11::init<>())
      .def("move", &CuboslavWrapper::move)
      .def("move_code", &CuboslavWrapper::moveCode)
      .def("set_cube", &CuboslavWrapper::setCube)
      .def("getCube", &CuboslavWrapper::getCube);
}
