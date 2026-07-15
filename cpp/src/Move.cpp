
#include <algorithm>
#include <array>
#include <iostream>

#include "Rubikoslav/Cuboslav.hpp"
#include "Rubikoslav/Move.hpp"

namespace rubikoslav {

Move::Move(char m) : move(m) {
  constexpr char moves[18] = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
                              'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'};

  int moveIndex = -1;
  for (int i = 0; i < 18; ++i) {
    if (moves[i] == m) {
      moveIndex = i;
      break;
    }
  }

  if (moveIndex == -1) {
    std::string error = "Invalid char '";
    error.push_back(m);
    error = error + "' for move generation";
    throw std::runtime_error(error);
  }

  face = moveIndex / 3;
  rotations = moveIndex % 3 + 1;
}

void Move::updateFaceRot() {
  int moveIndex = -1;
  for (int i = 0; i < 18; ++i) {
    if (detail::moves[i] == move) {
      moveIndex = i;
      break;
    }
  }

  if (moveIndex == -1) {
    std::string error = "Invalid char '";
    error.push_back(move);
    error = error + "' for move generation";
    throw std::runtime_error(error);
  }

  face = moveIndex / 3;
  rotations = moveIndex % 3 + 1;
}

Move::Move(const int face, const int rotations)
    : face(face), rotations(rotations) {
  if (face == 7 && rotations == 7) {
    move = '\0';
    return;
  }
  if (face < 0 || face > 5 || rotations < 1 || rotations > 3) {
    throw std::invalid_argument(
        "Move face must be 0-5 and rotations must be 1-3");
  }
  const int moveId = face * 3 + rotations - 1;
  move = detail::moves[moveId];
}

void Move::updateChar() {
  if (face < 0 || face > 5 || rotations < 1 || rotations > 3) {
    throw std::logic_error("Cannot encode an illegal face/rotation pair");
  }
  int moveId = face * 3 + rotations - 1;

  constexpr char moves[18] = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
                              'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'};

  move = moves[moveId];
}

std::string Move::notation() const {
  static constexpr std::array<char, 6> faces = {'U', 'L', 'F', 'B', 'R', 'D'};
  if (face < 0 || face >= static_cast<int>(faces.size()) || rotations < 1 ||
      rotations > 3) {
    throw std::logic_error("Cannot format an illegal move");
  }

  std::string result(1, faces[face]);
  if (rotations == 2) {
    result += '2';
  } else if (rotations == 3) {
    result += '\'';
  }
  return result;
}

Move Move::fromNotation(const std::string &notation) {
  if (notation.empty() || notation.size() > 2) {
    throw std::invalid_argument("Move must look like U, R2, or F'");
  }

  static constexpr std::array<char, 6> faces = {'U', 'L', 'F', 'B', 'R', 'D'};
  const auto faceIt = std::find(faces.begin(), faces.end(), notation.front());
  if (faceIt == faces.end()) {
    throw std::invalid_argument("Unknown move face: " + notation);
  }

  int rotations = 1;
  if (notation.size() == 2) {
    if (notation[1] == '2') {
      rotations = 2;
    } else if (notation[1] == '\'' || notation[1] == '3') {
      rotations = 3;
    } else {
      throw std::invalid_argument("Unknown move suffix: " + notation);
    }
  }

  return Move(static_cast<int>(std::distance(faces.begin(), faceIt)),
              rotations);
}

namespace {

void insertMove(std::vector<Move> &moves, Move &m) {
  if (moves.empty()) {
    moves.emplace_back(m);
    return;
  }

  if (moves.back().face == m.face) {
    moves.back().rotations = (moves.back().rotations + m.rotations) % 4;
    if (moves.back().rotations == 0) {
      moves.pop_back();
    } else {
      moves.back().updateChar();
    }
  } else if ((moves.size() > 1) and
             (moves.back().face == detail::oppositeFaceAll[m.face]) and
             (moves.at(moves.size() - 2).face == m.face)) {
    auto ix = moves.size() - 2;
    moves.at(ix).rotations = (moves.at(ix).rotations + m.rotations) % 4;
    if (moves.at(ix).rotations == 0) {
      moves.erase(moves.begin() + static_cast<std::ptrdiff_t>(ix));
    } else {
      moves.at(ix).updateChar();
    }
  } else {
    moves.emplace_back(m);
  }
}

} // namespace

std::vector<Move>
Move::combineMovesWithLookupMoves(const std::vector<Move> &moves,
                                  std::vector<Move> lookupMoves, bool reverse) {
  std::vector<Move> outMoves;

  for (auto m : moves) {
    outMoves.emplace_back(m);
  }

  if (reverse) {
    std::reverse(lookupMoves.begin(), lookupMoves.end());
  }

  for (auto m : lookupMoves) {
    outMoves.emplace_back(m.face, 4 - m.rotations);
  }

  return outMoves;
}

std::vector<Move> Move::combineMoves(std::vector<Move> &firstMoves,
                                     std::vector<Move> &secondMoves) {
  std::vector<Move> outMoves;

  for (auto &m : firstMoves) {
    insertMove(outMoves, m);
  }

  for (auto &m : secondMoves) {
    insertMove(outMoves, m);
  }

  return outMoves;
}

std::vector<Move> Move::combineMoves(std::vector<std::vector<Move>> &moves) {
  std::vector<Move> outMoves;

  for (auto &moveVector : moves) {
    for (auto &move : moveVector) {
      insertMove(outMoves, move);
    }
  }

  return outMoves;
}

std::vector<Move> Move::combineMoves(std::vector<Move> &moves) {
  std::vector<Move> out;

  for (auto &move : moves) {
    insertMove(out, move);
  }

  return out;
}

std::vector<char>
Move::convertVectorMoveToChar(const std::vector<Move> &moves) {
  std::vector<char> out;
  for (auto &m : moves) {
    out.push_back(m.move);
  }

  return out;
}

std::vector<Move>
Move::convertVectorCharToMove(const std::vector<char> &moves) {
  std::vector<Move> out;
  for (auto &m : moves) {
    out.emplace_back(m);
  }

  return out;
}

std::vector<std::string>
Move::convertVectorMoveToNotation(const std::vector<Move> &moves) {
  std::vector<std::string> out;
  out.reserve(moves.size());
  for (const auto &move : moves) {
    out.push_back(move.notation());
  }
  return out;
}

std::vector<Move>
Move::convertVectorNotationToMove(const std::vector<std::string> &moves) {
  std::vector<Move> out;
  out.reserve(moves.size());
  for (const auto &move : moves) {
    out.push_back(fromNotation(move));
  }
  return out;
}

void Move::printMoves(std::vector<Move> &moves) {
  std::cout << "Moves: ";

  for (auto m : moves) {
    switch (m.face) {
    case 0: {
      std::cout << "U";
    } break;

    case 1: {
      std::cout << "L";
    } break;

    case 2: {
      std::cout << "F";
    } break;

    case 3: {
      std::cout << "B";
    } break;

    case 4: {
      std::cout << "R";
    } break;

    case 5: {
      std::cout << "D";
    } break;
    }

    std::cout << m.rotations << " ";
  }

  std::cout << "\n";
}

void Move::printMoves(const std::vector<char> &moves, const std::string &end) {
  for (const auto m : moves) {
    std::cout << m;
  }

  std::cout << end;
}

} // namespace rubikoslav
