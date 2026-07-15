
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <map>
#include <random>
#include <sstream>

#include "Rubikoslav/Cuboslav.hpp"

std::array<Move, 18> RubikoslavConst::everyMove = {
    Move('A'), Move('B'), Move('C'), Move('D'), Move('E'), Move('F'),
    Move('G'), Move('H'), Move('I'), Move('J'), Move('K'), Move('L'),
    Move('M'), Move('N'), Move('O'), Move('P'), Move('Q'), Move('R')};

namespace {

using Corner = std::array<int, 3>;
using Edge = std::array<int, 2>;

constexpr std::array<Corner, 8> cornerFacelets = {{
    {{7, 37, 18}},  // U R F
    {{5, 16, 15}},  // U F L
    {{0, 10, 45}},  // U L B
    {{2, 47, 32}},  // U B R
    {{26, 23, 39}}, // D F R
    {{24, 13, 21}}, // D L F
    {{29, 40, 8}},  // D B L
    {{31, 34, 42}}, // D R B
}};

constexpr std::array<Edge, 12> edgeFacelets = {{
    {{4, 35}},  // U R
    {{6, 17}},  // U F
    {{3, 12}},  // U L
    {{1, 46}},  // U B
    {{28, 36}}, // D R
    {{25, 22}}, // D F
    {{27, 11}}, // D L
    {{30, 41}}, // D B
    {{20, 38}}, // F R
    {{19, 14}}, // F L
    {{43, 9}},  // B L
    {{44, 33}}, // B R
}};

template <std::size_t N> std::array<int, N> sorted(std::array<int, N> values) {
  std::sort(values.begin(), values.end());
  return values;
}

template <typename Container>
int permutationParity(const Container &permutation) {
  int inversions = 0;
  for (std::size_t i = 0; i < permutation.size(); ++i) {
    for (std::size_t j = i + 1; j < permutation.size(); ++j) {
      if (permutation[i] > permutation[j]) {
        ++inversions;
      }
    }
  }
  return inversions % 2;
}

} // namespace

Cuboslav::Cuboslav(const std::vector<int> &state) { setState(state); }

CubeValidationResult Cuboslav::validate(const std::vector<int> &state) {
  if (state.size() != 48) {
    return {false, "Cube state must contain exactly 48 sticker values"};
  }

  std::array<int, 6> colorCounts{};
  for (const int color : state) {
    if (color < 0 || color > 5) {
      return {false, "Sticker colors must be integers from 0 through 5"};
    }
    ++colorCounts[color];
  }
  for (std::size_t color = 0; color < colorCounts.size(); ++color) {
    if (colorCounts[color] != 8) {
      std::ostringstream message;
      message << "Color " << color << " occurs " << colorCounts[color]
              << " times; every color must occur exactly 8 times";
      return {false, message.str()};
    }
  }

  std::array<Corner, 8> solvedCorners{};
  std::map<Corner, int> cornerByColors;
  for (std::size_t i = 0; i < cornerFacelets.size(); ++i) {
    for (std::size_t j = 0; j < 3; ++j) {
      solvedCorners[i][j] = RubikoslavConst::solvedCube[cornerFacelets[i][j]];
    }
    cornerByColors[sorted(solvedCorners[i])] = static_cast<int>(i);
  }

  std::array<int, 8> cornerPermutation{};
  int cornerTwistSum = 0;
  std::array<bool, 8> seenCorners{};
  for (std::size_t location = 0; location < cornerFacelets.size(); ++location) {
    Corner observed{};
    for (std::size_t j = 0; j < 3; ++j) {
      observed[j] = state[cornerFacelets[location][j]];
    }

    const auto identity = cornerByColors.find(sorted(observed));
    if (identity == cornerByColors.end()) {
      return {false,
              "At least one corner has a color combination that cannot exist"};
    }
    const int cubie = identity->second;
    if (seenCorners[cubie]) {
      return {false,
              "A corner cubie is duplicated and another corner is missing"};
    }
    seenCorners[cubie] = true;
    cornerPermutation[location] = cubie;

    int orientation = -1;
    for (int j = 0; j < 3; ++j) {
      if (observed[j] == 0 || observed[j] == 5) {
        orientation = j;
        break;
      }
    }
    if (orientation < 0) {
      return {false, "Every corner must contain one white or yellow sticker"};
    }

    Corner normalized{};
    for (int j = 0; j < 3; ++j) {
      normalized[j] = observed[(j + orientation) % 3];
    }
    if (normalized != solvedCorners[cubie]) {
      return {false, "A corner's stickers are mirrored, which a legal turn "
                     "cannot produce"};
    }
    cornerTwistSum += orientation;
  }
  if (cornerTwistSum % 3 != 0) {
    return {
        false,
        "Corner orientation is impossible: one or more corners are twisted"};
  }

  std::array<Edge, 12> solvedEdges{};
  std::map<Edge, int> edgeByColors;
  for (std::size_t i = 0; i < edgeFacelets.size(); ++i) {
    for (std::size_t j = 0; j < 2; ++j) {
      solvedEdges[i][j] = RubikoslavConst::solvedCube[edgeFacelets[i][j]];
    }
    edgeByColors[sorted(solvedEdges[i])] = static_cast<int>(i);
  }

  std::array<int, 12> edgePermutation{};
  int edgeFlipSum = 0;
  std::array<bool, 12> seenEdges{};
  for (std::size_t location = 0; location < edgeFacelets.size(); ++location) {
    Edge observed{};
    for (std::size_t j = 0; j < 2; ++j) {
      observed[j] = state[edgeFacelets[location][j]];
    }

    const auto identity = edgeByColors.find(sorted(observed));
    if (identity == edgeByColors.end()) {
      return {false,
              "At least one edge has a color combination that cannot exist"};
    }
    const int cubie = identity->second;
    if (seenEdges[cubie]) {
      return {false, "An edge cubie is duplicated and another edge is missing"};
    }
    seenEdges[cubie] = true;
    edgePermutation[location] = cubie;

    if (observed == solvedEdges[cubie]) {
      continue;
    }
    if (observed[0] == solvedEdges[cubie][1] &&
        observed[1] == solvedEdges[cubie][0]) {
      ++edgeFlipSum;
      continue;
    }
    return {false, "An edge's stickers have an invalid orientation"};
  }
  if (edgeFlipSum % 2 != 0) {
    return {false,
            "Edge orientation is impossible: a single edge cannot be flipped"};
  }

  if (permutationParity(cornerPermutation) !=
      permutationParity(edgePermutation)) {
    return {
        false,
        "Piece permutation is impossible: two pieces cannot be swapped alone"};
  }

  return {true, {}};
}

void Cuboslav::setState(const std::vector<int> &state) {
  const auto validation = validate(state);
  if (!validation.valid) {
    throw std::invalid_argument(validation.message);
  }
  std::transform(state.begin(), state.end(), cube.begin(),
                 [](int sticker) { return static_cast<short>(sticker); });
}

unsigned short Cuboslav::convertBase5ToBin(int a, int b, int c) {
  return static_cast<unsigned short>(a * 36 + b * 6 + c);
}

std::array<unsigned int, 4> Cuboslav::hashCrossAnd2Corners() {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      auto ix0 = 12 * i + 3 * k + 0;
      auto ix1 = ix0 + 1;
      auto ix2 = ix0 + 2;

      auto face0 = cube[ix0];
      auto face1 = cube[ix1];
      auto face2 = cube[ix2];

      std::array<int, 3> indices = {ix0, ix1, ix2};
      std::array<short, 3> faces = {face0, face1, face2};
      std::array<int, 3> output = {0, 0, 0};

      for (int newIx = 0; newIx < 3; newIx++) {
        auto piece0 = RubikoslavConst::physicalPieces[indices[newIx]];
        auto currentFace = faces[newIx];
        output[newIx] = faces[newIx];

        if (piece0.size() > 1) {

          if ((cube[piece0[0]] == 5) || (cube[piece0[1]] == 5) ||
              (currentFace == 5)) {
            output[newIx] = 5;
          } else {
            auto white = (currentFace == 0) + (cube[piece0[0]] == 0) +
                         (cube[piece0[1]] == 0);
            auto orange = (currentFace == 4) + (cube[piece0[0]] == 4) +
                          (cube[piece0[1]] == 4);
            auto green = (currentFace == 3) + (cube[piece0[0]] == 3) +
                         (cube[piece0[1]] == 3);
            auto blue = (currentFace == 2) + (cube[piece0[0]] == 2) +
                        (cube[piece0[1]] == 2);

            if ((white + orange + green) == 3) {
              output[newIx] = 5;
            } else if ((white + orange + blue) == 3) {
              output[newIx] = 5;
            }
          }

        } else {

          if ((cube[piece0[0]] == 5) || (currentFace == 5)) {
            output[newIx] = 5;
          } else {
            auto orange = (currentFace == 4) + (cube[piece0[0]] == 4);
            auto green = (currentFace == 3) + (cube[piece0[0]] == 3);
            auto blue = (currentFace == 2) + (cube[piece0[0]] == 2);

            if (orange && green) {
              output[newIx] = 5;
            } else if (orange && blue) {
              output[newIx] = 5;
            }
          }
        }
      }

      auto convert = convertBase5ToBin(output[0], output[1], output[2]);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::hashCrossAnd2CornersV1() const {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      auto ix0 = 12 * i + 3 * k + 0;
      auto ix1 = ix0 + 1;
      auto ix2 = ix0 + 2;

      auto face0 = cube[ix0];
      auto face1 = cube[ix1];
      auto face2 = cube[ix2];

      std::array<int, 3> indices = {ix0, ix1, ix2};
      std::array<short, 3> faces = {face0, face1, face2};
      std::array<int, 3> output = {0, 0, 0};

      for (int newIx = 0; newIx < 3; newIx++) {
        const auto &piece0 = RubikoslavConst::physicalPieces[indices[newIx]];
        auto currentFace = faces[newIx];
        output[newIx] = faces[newIx];

        if (piece0.size() > 1) {

          if ((cube[piece0[0]] == 5) || (cube[piece0[1]] == 5) ||
              (currentFace == 5)) {
            output[newIx] = 5;
          } else {
            auto white = (currentFace == 0) + (cube[piece0[0]] == 0) +
                         (cube[piece0[1]] == 0);
            auto orange = (currentFace == 4) + (cube[piece0[0]] == 4) +
                          (cube[piece0[1]] == 4);
            auto green = (currentFace == 3) + (cube[piece0[0]] == 3) +
                         (cube[piece0[1]] == 3);
            auto blue = (currentFace == 2) + (cube[piece0[0]] == 2) +
                        (cube[piece0[1]] == 2);

            if ((white + orange + green) == 3) {
              output[newIx] = 5;
            } else if ((white + orange + blue) == 3) {
              output[newIx] = 5;
            }
          }

        } else {

          const auto orange = (currentFace == 4) + (cube[piece0[0]] == 4);
          const auto green = (currentFace == 3) + (cube[piece0[0]] == 3);
          const auto blue = (currentFace == 2) + (cube[piece0[0]] == 2);

          const bool c0 = (cube[piece0[0]] == 5) || (currentFace == 5);
          const bool c1 = (orange && green);
          const bool c2 = (orange && blue);
          const bool c = (c0 || c1 || c2);

          output[newIx] = 5 * (c) + output[newIx] * (!c);
        }
      }

      auto convert = convertBase5ToBin(output[0], output[1], output[2]);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::hashCrossAnd2CornersV2() {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      const auto ix0 = 12 * i + 3 * k + 0;
      const auto ix1 = ix0 + 1;
      const auto ix2 = ix0 + 2;

      const auto face0 = cube[ix0];
      const auto face1 = cube[ix1];
      const auto face2 = cube[ix2];

      const std::array<int, 3> indices = {ix0, ix1, ix2};
      const std::array<short, 3> faces = {face0, face1, face2};
      std::array<int, 3> output = {0, 0, 0};

      for (int newIx = 0; newIx < 3; newIx++) {
        const auto &piece0 = RubikoslavConst::physicalPieces[indices[newIx]];
        const auto currentFace = faces[newIx];
        output[newIx] = faces[newIx];

        if (piece0.size() > 1) {
          auto white = (currentFace == 0) + (cube[piece0[0]] == 0) +
                       (cube[piece0[1]] == 0);
          auto orange = (currentFace == 4) + (cube[piece0[0]] == 4) +
                        (cube[piece0[1]] == 4);
          auto green = (currentFace == 3) + (cube[piece0[0]] == 3) +
                       (cube[piece0[1]] == 3);
          auto blue = (currentFace == 2) + (cube[piece0[0]] == 2) +
                      (cube[piece0[1]] == 2);

          bool c0 = (cube[piece0[0]] == 5) || (cube[piece0[1]] == 5) ||
                    (currentFace == 5);
          bool c1 = ((white + orange + green) == 3);
          bool c2 = ((white + orange + blue) == 3);
          bool c = (c0 || c1 || c2);

          output[newIx] = 5 * (c) + output[newIx] * (!c);

        } else {

          const auto orange = (currentFace == 4) + (cube[piece0[0]] == 4);
          const auto green = (currentFace == 3) + (cube[piece0[0]] == 3);
          const auto blue = (currentFace == 2) + (cube[piece0[0]] == 2);

          const bool c0 = (cube[piece0[0]] == 5) || (currentFace == 5);
          const bool c1 = (orange && green);
          const bool c2 = (orange && blue);
          const bool c = (c0 || c1 || c2);

          output[newIx] = 5 * (c) + output[newIx] * (!c);
        }
      }

      auto convert = convertBase5ToBin(output[0], output[1], output[2]);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::hashCrossAnd3Corners() {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      auto ix0 = 12 * i + 3 * k + 0;
      auto ix1 = ix0 + 1;
      auto ix2 = ix0 + 2;

      auto face0 = cube[ix0];
      auto face1 = cube[ix1];
      auto face2 = cube[ix2];

      std::array<int, 3> indices = {ix0, ix1, ix2};
      std::array<short, 3> faces = {face0, face1, face2};
      std::array<int, 3> output = {0, 0, 0};

      for (int newIx = 0; newIx < 3; newIx++) {
        const auto &piece0 = RubikoslavConst::physicalPieces[indices[newIx]];
        auto currentFace = faces[newIx];
        output[newIx] = faces[newIx];

        if (piece0.size() > 1) {

          if ((cube[piece0[0]] == 5) || (cube[piece0[1]] == 5) ||
              (currentFace == 5)) {
            output[newIx] = 5;
          } else {
            auto white = (currentFace == 0) + (cube[piece0[0]] == 0) +
                         (cube[piece0[1]] == 0);
            auto orange = (currentFace == 4) + (cube[piece0[0]] == 4) +
                          (cube[piece0[1]] == 4);
            auto green = (currentFace == 3) + (cube[piece0[0]] == 3) +
                         (cube[piece0[1]] == 3);

            if ((white + orange + green) == 3) {
              output[newIx] = 5;
            }
          }

        } else {

          if ((cube[piece0[0]] == 5) || (currentFace == 5)) {
            output[newIx] = 5;
          } else {
            auto orange = (currentFace == 4) + (cube[piece0[0]] == 4);
            auto green = (currentFace == 3) + (cube[piece0[0]] == 3);

            if (orange && green) {
              output[newIx] = 5;
            }
          }
        }
      }

      auto convert = convertBase5ToBin(output[0], output[1], output[2]);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::hashFirstTwoLayers() {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      auto ix0 = 12 * i + 3 * k + 0;
      auto ix1 = ix0 + 1;
      auto ix2 = ix0 + 2;

      auto face0 = cube[ix0];
      auto face1 = cube[ix1];
      auto face2 = cube[ix2];

      auto piece0 = RubikoslavConst::physicalPieces[ix0];
      short output0 = face0;
      for (auto tmp : piece0) {
        if (cube[tmp] == 5) {
          output0 = 5;
        }
      }

      auto piece1 = RubikoslavConst::physicalPieces[ix1];
      short output1 = face1;
      for (auto tmp : piece1) {
        if (cube[tmp] == 5) {
          output1 = 5;
        }
      }

      auto piece2 = RubikoslavConst::physicalPieces[ix2];
      short output2 = face2;
      for (auto tmp : piece2) {
        if (cube[tmp] == 5) {
          output2 = 5;
        }
      }

      auto convert = convertBase5ToBin(output0, output1, output2);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::hashFullCube() {
  std::array<unsigned int, 4> vals = {0, 0, 0, 0};

  for (int i = 0; i < 4; i++) {
    unsigned int val = 0;
    for (int k = 0; k < 4; k++) {

      auto ix0 = 12 * i + 3 * k + 0;
      auto ix1 = ix0 + 1;
      auto ix2 = ix0 + 2;

      auto face0 = cube[ix0];
      auto face1 = cube[ix1];
      auto face2 = cube[ix2];

      auto convert = convertBase5ToBin(face0, face1, face2);
      val = val << 8;
      val |= convert;
    }
    vals[i] = val;
  }

  return vals;
}

std::array<unsigned int, 4> Cuboslav::getFromHash(Hash hash) {
  switch (hash) {
  case TwoCorners: {
    return hashCrossAnd2CornersV1();
  } break;

  case ThreeCorners: {
    return hashCrossAnd3Corners();
  } break;

  case FirstTwoLayers: {
    return hashFirstTwoLayers();
  } break;

  case WholeCube: {
    return hashFullCube();
  } break;

  case TwoCornerNewHash:
    break;
  }

  throw std::runtime_error(
      "Wrong hash or something. Cuboslav.cpp, getFromHash(Hash)");
}

void Cuboslav::print() {
  int space = 0;

  for (auto val : cube) {
    std::cout << std::to_string(val) << " ";

    if (space == 7) {
      std::cout << " | ";
      space = -1;
    }

    space++;
  }

  std::cout << "\n";
}

void Cuboslav::print(const std::array<short, 48> &cube) {
  int space = 0;

  for (const auto val : cube) {
    std::cout << std::to_string(val) << " ";

    if (space == 7) {
      std::cout << " | ";
      space = -1;
    }

    space++;
  }

  std::cout << "\n";
}

bool Cuboslav::solved() const {
  std::array<short, 48> tmp = {0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,
                               2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 5, 5,
                               4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3};
  return (cube == tmp);
}

bool Cuboslav::solvedWhiteCross() {
  return (cube[1] == 0 && cube[3] == 0 && cube[4] == 0 && cube[6] == 0 &&
          cube[46] == 3 && cube[12] == 1 && cube[35] == 4 && cube[17] == 2);
}

bool Cuboslav::solvedFirstTwoLayers() const {
  if (!std::all_of(cube.begin(), cube.begin() + 8,
                   [](const short color) { return color == 0; })) {
    return false;
  }

  for (const int face : {1, 2, 4, 5}) {
    const int offset = face * 8;
    const short expectedColor = RubikoslavConst::solvedCube[offset];
    for (int sticker = 0; sticker < 5; ++sticker) {
      if (cube[offset + sticker] != expectedColor) {
        return false;
      }
    }
  }
  return true;
}

int Cuboslav::numCornerSolved() {
  return solvedBOCorner() + solvedGRCorner() + solvedOGCorner() +
         solvedRBCorner();
}

bool Cuboslav::solvedRBCorner() {
  return (cube[5] == 0 && cube[16] == 2 && cube[15] == 1 && cube[14] == 1 &&
          cube[19] == 2);
}

bool Cuboslav::solvedGRCorner() {
  return (cube[0] == 0 && cube[45] == 3 && cube[10] == 1 && cube[9] == 1 &&
          cube[43] == 3);
}

bool Cuboslav::solvedOGCorner() {
  return (cube[2] == 0 && cube[47] == 3 && cube[44] == 3 && cube[32] == 4 &&
          cube[33] == 4);
}

bool Cuboslav::solvedBOCorner() {
  return (cube[7] == 0 && cube[18] == 2 && cube[37] == 4 && cube[38] == 4 &&
          cube[20] == 2);
}

std::vector<Move> Cuboslav::shuffle(int numMoves, bool print,
                                    unsigned int seed) {
  // std::random_device dev;

  std::mt19937 rng;
  rng.seed(seed);

  std::uniform_int_distribution<std::mt19937::result_type> dist6(0, 5);
  std::uniform_int_distribution<std::mt19937::result_type> distNum(1, 3);

  std::vector<Move> shuffleMoves;
  int prevFace = -1;

  for (int i = 0; i < numMoves; i++) {
    auto face = static_cast<int>(dist6(rng));
    auto num = static_cast<int>(distNum(rng));

    if (face == prevFace) {
      numMoves++;
      continue;
    } else {
      prevFace = face;
    }

    turn(face, num);
    shuffleMoves.emplace_back(static_cast<short>(face),
                              static_cast<short>(num));

    if (print) {
      std::cout << "f" << face << "n" << num << " | ";
    }
  }

  if (print) {
    std::cout << "\n";
  }
  return shuffleMoves;
}

void Cuboslav::raiseCross() {
  if (!solvedWhiteCross()) {
    throw std::runtime_error("Cross not solved.");
  }
}

void Cuboslav::raiseTwoCorners() {
  if (numCornerSolved() < 2) {
    throw std::runtime_error("Not solved two corners.");
  }
}

void Cuboslav::raiseThreeCorners() {
  if (numCornerSolved() < 3) {
    throw std::runtime_error("Not solved three corners.");
  }
}

void Cuboslav::raiseTwoLayer() {
  if (!solvedFirstTwoLayers()) {
    throw std::runtime_error("First two layers are not solved");
  }
}

void Cuboslav::raiseSolved() {
  if (!solved()) {
    throw std::runtime_error("Cube not solved.");
  }
}

void Cuboslav::turn(Move m) {
  switch (m.move) {
  case 'A': {
    turnWhite1();
  } break;

  case 'B': {
    turnWhite2();
  } break;

  case 'C': {
    turnWhite3();
  } break;

  case 'D': {
    turnRed1();
  } break;

  case 'E': {
    turnRed2();
  } break;

  case 'F': {
    turnRed3();
  } break;

  case 'G': {
    turnBlue1();
  } break;

  case 'H': {
    turnBlue2();
  } break;

  case 'I': {
    turnBlue3();
  } break;

  case 'J': {
    turnGreen1();
  } break;

  case 'K': {
    turnGreen2();
  } break;

  case 'L': {
    turnGreen3();
  } break;

  case 'M': {
    turnOrange1();
  } break;

  case 'N': {
    turnOrange2();
  } break;

  case 'O': {
    turnOrange3();
  } break;

  case 'P': {
    turnYellow1();
  } break;

  case 'Q': {
    turnYellow2();
  } break;

  case 'R': {
    turnYellow3();
  } break;

  default:
    throw std::invalid_argument("Cannot turn the cube with an illegal move");
  }
}

void Cuboslav::turn(char m) {
  Move move = Move(m);
  turn(move);
}

void Cuboslav::turn(int face, int rotations) { turn(Move(face, rotations)); }

void Cuboslav::turnWhite(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnWhite1();
  } break;
  case 2: {
    Cuboslav::turnWhite2();
  } break;
  case 3: {
    Cuboslav::turnWhite3();
  } break;
  }
}

void Cuboslav::turnBlue(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnBlue1();
  } break;
  case 2: {
    Cuboslav::turnBlue2();
  } break;
  case 3: {
    Cuboslav::turnBlue3();
  } break;
  }
}

void Cuboslav::turnRed(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnRed1();
  } break;
  case 2: {
    Cuboslav::turnRed2();
  } break;
  case 3: {
    Cuboslav::turnRed3();
  } break;
  }
}

void Cuboslav::turnGreen(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnGreen1();
  } break;
  case 2: {
    Cuboslav::turnGreen2();
  } break;
  case 3: {
    Cuboslav::turnGreen3();
  } break;
  }
}

void Cuboslav::turnOrange(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnOrange1();
  } break;
  case 2: {
    Cuboslav::turnOrange2();
  } break;
  case 3: {
    Cuboslav::turnOrange3();
  } break;
  }
}

void Cuboslav::turnYellow(int rotations) {
  switch (rotations) {
  case 1: {
    Cuboslav::turnYellow1();
  } break;
  case 2: {
    Cuboslav::turnYellow2();
  } break;
  case 3: {
    Cuboslav::turnYellow3();
  } break;
  }
}

void Cuboslav::turnWhite3() {
  short tmp;
  tmp = cube[47];
  cube[47] = cube[37];
  cube[37] = cube[16];
  cube[16] = cube[10];
  cube[10] = tmp;

  tmp = cube[46];
  cube[46] = cube[35];
  cube[35] = cube[17];
  cube[17] = cube[12];
  cube[12] = tmp;

  tmp = cube[45];
  cube[45] = cube[32];
  cube[32] = cube[18];
  cube[18] = cube[15];
  cube[15] = tmp;

  tmp = cube[7];
  cube[7] = cube[5];
  cube[5] = cube[0];
  cube[0] = cube[2];
  cube[2] = tmp;

  tmp = cube[4];
  cube[4] = cube[6];
  cube[6] = cube[3];
  cube[3] = cube[1];
  cube[1] = tmp;
}

void Cuboslav::turnWhite2() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[16];
  cube[16] = tmp;

  tmp = cube[46];
  cube[46] = cube[17];
  cube[17] = tmp;

  tmp = cube[45];
  cube[45] = cube[18];
  cube[18] = tmp;

  tmp = cube[37];
  cube[37] = cube[10];
  cube[10] = tmp;

  tmp = cube[35];
  cube[35] = cube[12];
  cube[12] = tmp;

  tmp = cube[32];
  cube[32] = cube[15];
  cube[15] = tmp;

  tmp = cube[7];
  cube[7] = cube[0];
  cube[0] = tmp;

  tmp = cube[4];
  cube[4] = cube[3];
  cube[3] = tmp;

  tmp = cube[2];
  cube[2] = cube[5];
  cube[5] = tmp;

  tmp = cube[6];
  cube[6] = cube[1];
  cube[1] = tmp;
}

void Cuboslav::turnWhite1() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[10];
  cube[10] = cube[16];
  cube[16] = cube[37];
  cube[37] = tmp;

  tmp = cube[46];
  cube[46] = cube[12];
  cube[12] = cube[17];
  cube[17] = cube[35];
  cube[35] = tmp;

  tmp = cube[45];
  cube[45] = cube[15];
  cube[15] = cube[18];
  cube[18] = cube[32];
  cube[32] = tmp;

  tmp = cube[7];
  cube[7] = cube[2];
  cube[2] = cube[0];
  cube[0] = cube[5];
  cube[5] = tmp;

  tmp = cube[4];
  cube[4] = cube[1];
  cube[1] = cube[3];
  cube[3] = cube[6];
  cube[6] = tmp;
}

void Cuboslav::turnRed3() {
  short tmp;

  tmp = cube[45];
  cube[45] = cube[5];
  cube[5] = cube[21];
  cube[21] = cube[29];
  cube[29] = tmp;

  tmp = cube[43];
  cube[43] = cube[3];
  cube[3] = cube[19];
  cube[19] = cube[27];
  cube[27] = tmp;

  tmp = cube[40];
  cube[40] = cube[0];
  cube[0] = cube[16];
  cube[16] = cube[24];
  cube[24] = tmp;

  tmp = cube[15];
  cube[15] = cube[13];
  cube[13] = cube[8];
  cube[8] = cube[10];
  cube[10] = tmp;

  tmp = cube[12];
  cube[12] = cube[14];
  cube[14] = cube[11];
  cube[11] = cube[9];
  cube[9] = tmp;
}

void Cuboslav::turnRed2() {
  short tmp;

  tmp = cube[45];
  cube[45] = cube[21];
  cube[21] = tmp;

  tmp = cube[43];
  cube[43] = cube[19];
  cube[19] = tmp;

  tmp = cube[40];
  cube[40] = cube[16];
  cube[16] = tmp;

  tmp = cube[24];
  cube[24] = cube[0];
  cube[0] = tmp;

  tmp = cube[27];
  cube[27] = cube[3];
  cube[3] = tmp;

  tmp = cube[29];
  cube[29] = cube[5];
  cube[5] = tmp;

  tmp = cube[15];
  cube[15] = cube[8];
  cube[8] = tmp;

  tmp = cube[12];
  cube[12] = cube[11];
  cube[11] = tmp;

  tmp = cube[10];
  cube[10] = cube[13];
  cube[13] = tmp;

  tmp = cube[14];
  cube[14] = cube[9];
  cube[9] = tmp;
}

void Cuboslav::turnRed1() {
  short tmp;

  tmp = cube[45];
  cube[45] = cube[29];
  cube[29] = cube[21];
  cube[21] = cube[5];
  cube[5] = tmp;

  tmp = cube[43];
  cube[43] = cube[27];
  cube[27] = cube[19];
  cube[19] = cube[3];
  cube[3] = tmp;

  tmp = cube[40];
  cube[40] = cube[24];
  cube[24] = cube[16];
  cube[16] = cube[0];
  cube[0] = tmp;

  tmp = cube[15];
  cube[15] = cube[10];
  cube[10] = cube[8];
  cube[8] = cube[13];
  cube[13] = tmp;

  tmp = cube[12];
  cube[12] = cube[9];
  cube[9] = cube[11];
  cube[11] = cube[14];
  cube[14] = tmp;
}

void Cuboslav::turnBlue3() {
  short tmp;

  tmp = cube[39];
  cube[39] = cube[24];
  cube[24] = cube[15];
  cube[15] = cube[7];
  cube[7] = tmp;

  tmp = cube[38];
  cube[38] = cube[25];
  cube[25] = cube[14];
  cube[14] = cube[6];
  cube[6] = tmp;

  tmp = cube[37];
  cube[37] = cube[26];
  cube[26] = cube[13];
  cube[13] = cube[5];
  cube[5] = tmp;

  tmp = cube[23];
  cube[23] = cube[21];
  cube[21] = cube[16];
  cube[16] = cube[18];
  cube[18] = tmp;

  tmp = cube[20];
  cube[20] = cube[22];
  cube[22] = cube[19];
  cube[19] = cube[17];
  cube[17] = tmp;
}

void Cuboslav::turnBlue2() {
  short tmp;

  tmp = cube[39];
  cube[39] = cube[15];
  cube[15] = tmp;

  tmp = cube[38];
  cube[38] = cube[14];
  cube[14] = tmp;

  tmp = cube[37];
  cube[37] = cube[13];
  cube[13] = tmp;

  tmp = cube[24];
  cube[24] = cube[7];
  cube[7] = tmp;

  tmp = cube[25];
  cube[25] = cube[6];
  cube[6] = tmp;

  tmp = cube[26];
  cube[26] = cube[5];
  cube[5] = tmp;

  tmp = cube[23];
  cube[23] = cube[16];
  cube[16] = tmp;

  tmp = cube[20];
  cube[20] = cube[19];
  cube[19] = tmp;

  tmp = cube[18];
  cube[18] = cube[21];
  cube[21] = tmp;

  tmp = cube[22];
  cube[22] = cube[17];
  cube[17] = tmp;
}

void Cuboslav::turnBlue1() {
  short tmp;

  tmp = cube[39];
  cube[39] = cube[7];
  cube[7] = cube[15];
  cube[15] = cube[24];
  cube[24] = tmp;

  tmp = cube[38];
  cube[38] = cube[6];
  cube[6] = cube[14];
  cube[14] = cube[25];
  cube[25] = tmp;

  tmp = cube[37];
  cube[37] = cube[5];
  cube[5] = cube[13];
  cube[13] = cube[26];
  cube[26] = tmp;

  tmp = cube[23];
  cube[23] = cube[18];
  cube[18] = cube[16];
  cube[16] = cube[21];
  cube[21] = tmp;

  tmp = cube[20];
  cube[20] = cube[17];
  cube[17] = cube[19];
  cube[19] = cube[22];
  cube[22] = tmp;
}

void Cuboslav::turnYellow3() {
  short tmp;

  tmp = cube[42];
  cube[42] = cube[8];
  cube[8] = cube[21];
  cube[21] = cube[39];
  cube[39] = tmp;

  tmp = cube[41];
  cube[41] = cube[11];
  cube[11] = cube[22];
  cube[22] = cube[36];
  cube[36] = tmp;

  tmp = cube[40];
  cube[40] = cube[13];
  cube[13] = cube[23];
  cube[23] = cube[34];
  cube[34] = tmp;

  tmp = cube[31];
  cube[31] = cube[29];
  cube[29] = cube[24];
  cube[24] = cube[26];
  cube[26] = tmp;

  tmp = cube[28];
  cube[28] = cube[30];
  cube[30] = cube[27];
  cube[27] = cube[25];
  cube[25] = tmp;
}

void Cuboslav::turnYellow2() {
  short tmp;

  tmp = cube[42];
  cube[42] = cube[21];
  cube[21] = tmp;

  tmp = cube[41];
  cube[41] = cube[22];
  cube[22] = tmp;

  tmp = cube[40];
  cube[40] = cube[23];
  cube[23] = tmp;

  tmp = cube[39];
  cube[39] = cube[8];
  cube[8] = tmp;

  tmp = cube[36];
  cube[36] = cube[11];
  cube[11] = tmp;

  tmp = cube[34];
  cube[34] = cube[13];
  cube[13] = tmp;

  tmp = cube[31];
  cube[31] = cube[24];
  cube[24] = tmp;

  tmp = cube[28];
  cube[28] = cube[27];
  cube[27] = tmp;

  tmp = cube[26];
  cube[26] = cube[29];
  cube[29] = tmp;

  tmp = cube[30];
  cube[30] = cube[25];
  cube[25] = tmp;
}

void Cuboslav::turnYellow1() {
  short tmp;

  tmp = cube[42];
  cube[42] = cube[39];
  cube[39] = cube[21];
  cube[21] = cube[8];
  cube[8] = tmp;

  tmp = cube[41];
  cube[41] = cube[36];
  cube[36] = cube[22];
  cube[22] = cube[11];
  cube[11] = tmp;

  tmp = cube[40];
  cube[40] = cube[34];
  cube[34] = cube[23];
  cube[23] = cube[13];
  cube[13] = tmp;

  tmp = cube[31];
  cube[31] = cube[26];
  cube[26] = cube[24];
  cube[24] = cube[29];
  cube[29] = tmp;

  tmp = cube[28];
  cube[28] = cube[25];
  cube[25] = cube[27];
  cube[27] = cube[30];
  cube[30] = tmp;
}

void Cuboslav::turnOrange3() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[31];
  cube[31] = cube[23];
  cube[23] = cube[7];
  cube[7] = tmp;

  tmp = cube[44];
  cube[44] = cube[28];
  cube[28] = cube[20];
  cube[20] = cube[4];
  cube[4] = tmp;

  tmp = cube[42];
  cube[42] = cube[26];
  cube[26] = cube[18];
  cube[18] = cube[2];
  cube[2] = tmp;

  tmp = cube[39];
  cube[39] = cube[37];
  cube[37] = cube[32];
  cube[32] = cube[34];
  cube[34] = tmp;

  tmp = cube[36];
  cube[36] = cube[38];
  cube[38] = cube[35];
  cube[35] = cube[33];
  cube[33] = tmp;
}

void Cuboslav::turnOrange2() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[23];
  cube[23] = tmp;

  tmp = cube[44];
  cube[44] = cube[20];
  cube[20] = tmp;

  tmp = cube[42];
  cube[42] = cube[18];
  cube[18] = tmp;

  tmp = cube[39];
  cube[39] = cube[32];
  cube[32] = tmp;

  tmp = cube[36];
  cube[36] = cube[35];
  cube[35] = tmp;

  tmp = cube[34];
  cube[34] = cube[37];
  cube[37] = tmp;

  tmp = cube[38];
  cube[38] = cube[33];
  cube[33] = tmp;

  tmp = cube[26];
  cube[26] = cube[2];
  cube[2] = tmp;

  tmp = cube[28];
  cube[28] = cube[4];
  cube[4] = tmp;

  tmp = cube[31];
  cube[31] = cube[7];
  cube[7] = tmp;
}

void Cuboslav::turnOrange1() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[7];
  cube[7] = cube[23];
  cube[23] = cube[31];
  cube[31] = tmp;

  tmp = cube[44];
  cube[44] = cube[4];
  cube[4] = cube[20];
  cube[20] = cube[28];
  cube[28] = tmp;

  tmp = cube[42];
  cube[42] = cube[2];
  cube[2] = cube[18];
  cube[18] = cube[26];
  cube[26] = tmp;

  tmp = cube[39];
  cube[39] = cube[34];
  cube[34] = cube[32];
  cube[32] = cube[37];
  cube[37] = tmp;

  tmp = cube[36];
  cube[36] = cube[33];
  cube[33] = cube[35];
  cube[35] = cube[38];
  cube[38] = tmp;
}

void Cuboslav::turnGreen3() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[45];
  cube[45] = cube[40];
  cube[40] = cube[42];
  cube[42] = tmp;

  tmp = cube[44];
  cube[44] = cube[46];
  cube[46] = cube[43];
  cube[43] = cube[41];
  cube[41] = tmp;

  tmp = cube[34];
  cube[34] = cube[2];
  cube[2] = cube[10];
  cube[10] = cube[29];
  cube[29] = tmp;

  tmp = cube[33];
  cube[33] = cube[1];
  cube[1] = cube[9];
  cube[9] = cube[30];
  cube[30] = tmp;

  tmp = cube[32];
  cube[32] = cube[0];
  cube[0] = cube[8];
  cube[8] = cube[31];
  cube[31] = tmp;
}

void Cuboslav::turnGreen2() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[40];
  cube[40] = tmp;

  tmp = cube[44];
  cube[44] = cube[43];
  cube[43] = tmp;

  tmp = cube[42];
  cube[42] = cube[45];
  cube[45] = tmp;

  tmp = cube[46];
  cube[46] = cube[41];
  cube[41] = tmp;

  tmp = cube[34];
  cube[34] = cube[10];
  cube[10] = tmp;

  tmp = cube[33];
  cube[33] = cube[9];
  cube[9] = tmp;

  tmp = cube[32];
  cube[32] = cube[8];
  cube[8] = tmp;

  tmp = cube[29];
  cube[29] = cube[2];
  cube[2] = tmp;

  tmp = cube[30];
  cube[30] = cube[1];
  cube[1] = tmp;

  tmp = cube[31];
  cube[31] = cube[0];
  cube[0] = tmp;
}

void Cuboslav::turnGreen1() {
  short tmp;

  tmp = cube[47];
  cube[47] = cube[42];
  cube[42] = cube[40];
  cube[40] = cube[45];
  cube[45] = tmp;

  tmp = cube[44];
  cube[44] = cube[41];
  cube[41] = cube[43];
  cube[43] = cube[46];
  cube[46] = tmp;

  tmp = cube[34];
  cube[34] = cube[29];
  cube[29] = cube[10];
  cube[10] = cube[2];
  cube[2] = tmp;

  tmp = cube[33];
  cube[33] = cube[30];
  cube[30] = cube[9];
  cube[9] = cube[1];
  cube[1] = tmp;

  tmp = cube[32];
  cube[32] = cube[31];
  cube[31] = cube[8];
  cube[8] = cube[0];
  cube[0] = tmp;
}
