
#ifndef RUBIKOSLAV_MOVE_HPP
#define RUBIKOSLAV_MOVE_HPP

#include <array>
#include <stdexcept>
#include <string>
#include <vector>

namespace rubikoslav {

class Move {
public:
  explicit Move(char m);
  Move(int face, int rotations);

  void updateChar();
  void updateFaceRot();

  [[nodiscard]] std::string notation() const;
  static Move fromNotation(const std::string &notation);

  char move;

  int face;
  int rotations;

  bool operator==(const Move &other) const { return (move == other.move); }

  static std::vector<Move>
  combineMovesWithLookupMoves(const std::vector<Move> &moves,
                              std::vector<Move> lookupMoves,
                              bool reverse = true);
  static std::vector<Move> combineMoves(std::vector<Move> &firstMoves,
                                        std::vector<Move> &secondMoves);
  static std::vector<Move> combineMoves(std::vector<std::vector<Move>> &moves);
  static std::vector<Move> combineMoves(std::vector<Move> &moves);

  static std::vector<char>
  convertVectorMoveToChar(const std::vector<Move> &moves);
  static std::vector<Move>
  convertVectorCharToMove(const std::vector<char> &moves);
  static std::vector<std::string>
  convertVectorMoveToNotation(const std::vector<Move> &moves);
  static std::vector<Move>
  convertVectorNotationToMove(const std::vector<std::string> &moves);

  static void printMoves(std::vector<Move> &moves);
  static void printMoves(const std::vector<char> &moves,
                         const std::string &end = "\n");
};

namespace detail {
inline const Move illegalMove{7, 7};

inline constexpr std::array<char, 18> moves = {'A', 'B', 'C', 'D', 'E', 'F',
                                               'G', 'H', 'I', 'J', 'K', 'L',
                                               'M', 'N', 'O', 'P', 'Q', 'R'};
} // namespace detail

} // namespace rubikoslav

#endif // RUBIKOSLAV_MOVE_HPP
