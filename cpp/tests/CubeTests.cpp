#include <array>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "Rubikoslav/Cuboslav.hpp"
#include "Rubikoslav/Move.hpp"

namespace {

using rubikoslav::Cuboslav;
using rubikoslav::Move;

int failures = 0;

void expect(const bool condition, const std::string &message) {
  if (!condition) {
    ++failures;
    std::cerr << "FAIL: " << message << '\n';
  }
}

std::vector<int> stateOf(const Cuboslav &cube) {
  return {cube.cube.begin(), cube.cube.end()};
}

void testMoves() {
  for (const char code : rubikoslav::detail::moves) {
    const Move move(code);
    Cuboslav cube;
    cube.turn(move);
    cube.turn(move.face, 4 - move.rotations);
    expect(cube.solved(),
           std::string("move and inverse restore solved cube: ") + code);
    expect(Cuboslav::validate(stateOf(cube)).valid, "restored cube validates");
  }

  for (int face = 0; face < 6; ++face) {
    Cuboslav cube;
    for (int turn = 0; turn < 4; ++turn) {
      cube.turn(face, 1);
    }
    expect(cube.solved(), "four quarter turns restore a face");
  }

  Cuboslav shuffled;
  shuffled.shuffle(200, false, 42);
  expect(Cuboslav::validate(stateOf(shuffled)).valid,
         "a long legal scramble validates");
  expect(Cuboslav().solvedFirstTwoLayers(),
         "solved cube has its first two layers solved");
}

void testNotation() {
  const std::array<std::string, 6> samples = {"U", "L2", "F'", "B3", "R", "D2"};
  for (const auto &sample : samples) {
    const auto move = Move::fromNotation(sample);
    const auto canonical =
        sample.ends_with('3') ? sample.substr(0, 1) + "'" : sample;
    expect(move.notation() == canonical, "notation round trip for " + sample);
  }

  bool rejected = false;
  try {
    (void)Move::fromNotation("X");
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  expect(rejected, "unknown notation is rejected");

  std::vector<Move> moves = {Move::fromNotation("U"), Move::fromNotation("U'")};
  const auto simplified = Move::combineMoves(moves);
  expect(simplified.empty(), "opposite adjacent moves cancel");

  std::vector<Move> separated = {Move::fromNotation("U"),
                                 Move::fromNotation("D"),
                                 Move::fromNotation("U'")};
  const auto simplifiedSeparated = Move::combineMoves(separated);
  expect(simplifiedSeparated.size() == 1 &&
             simplifiedSeparated.front().notation() == "D",
         "same-face moves cancel across an opposite-face move");
}

void testValidation() {
  Cuboslav solved;
  auto state = stateOf(solved);
  expect(Cuboslav::validate(state).valid, "solved state validates");

  auto shortState = state;
  shortState.pop_back();
  expect(!Cuboslav::validate(shortState).valid, "short state is rejected");

  auto wrongCounts = state;
  wrongCounts[0] = 1;
  expect(!Cuboslav::validate(wrongCounts).valid,
         "wrong color counts are rejected");

  auto singleEdgeFlip = state;
  std::swap(singleEdgeFlip[4], singleEdgeFlip[35]);
  expect(!Cuboslav::validate(singleEdgeFlip).valid,
         "single flipped edge is rejected");

  auto singleCornerTwist = state;
  const int heldCorner = singleCornerTwist[7];
  singleCornerTwist[7] = singleCornerTwist[37];
  singleCornerTwist[37] = singleCornerTwist[18];
  singleCornerTwist[18] = heldCorner;
  expect(!Cuboslav::validate(singleCornerTwist).valid,
         "single twisted corner is rejected");

  auto twoEdgeSwap = state;
  std::swap(twoEdgeSwap[4], twoEdgeSwap[6]);
  std::swap(twoEdgeSwap[35], twoEdgeSwap[17]);
  expect(!Cuboslav::validate(twoEdgeSwap).valid,
         "odd edge-only permutation is rejected");

  bool constructorRejected = false;
  try {
    (void)Cuboslav(shortState);
  } catch (const std::invalid_argument &) {
    constructorRejected = true;
  }
  expect(constructorRejected, "cube constructor enforces validation");
}

} // namespace

int main() {
  testMoves();
  testNotation();
  testValidation();
  if (failures != 0) {
    std::cerr << failures << " test(s) failed\n";
    return 1;
  }
  std::cout << "All Rubikoslav core tests passed\n";
  return 0;
}
