#include <iostream>
#include <string>
#include <vector>

#include "Rubikoslav/Move.hpp"
#include "Rubikoslav/Cuboslav.hpp"

int main(int argc, char **argv) {
  Cuboslav cube;
  std::vector<std::string> notation;

  for (int i = 1; i < argc; ++i) {
    notation.emplace_back(argv[i]);
  }

  if (notation.empty()) {
    const auto scramble = cube.shuffle(20, false, 20260714);
    notation = Move::convertVectorMoveToNotation(scramble);
    std::cout << "Deterministic scramble:";
  } else {
    for (const auto &move : Move::convertVectorNotationToMove(notation)) {
      cube.turn(move);
    }
    std::cout << "Applied moves:";
  }

  for (const auto &move : notation) {
    std::cout << ' ' << move;
  }
  std::cout << "\nState:";
  for (const auto sticker : cube.cube) {
    std::cout << ' ' << sticker;
  }
  std::cout << '\n';
  return 0;
}
