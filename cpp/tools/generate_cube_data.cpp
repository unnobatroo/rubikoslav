#include <array>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

#include "Rubikoslav/Cuboslav.hpp"
#include "Rubikoslav/Move.hpp"

namespace {

struct FaceLayout {
  char name;
  short center;
  std::array<int, 9> stickers;
};

constexpr std::array<FaceLayout, 6> faceLayouts = {{
    {'U', 0, {0, 1, 2, 3, -1, 4, 5, 6, 7}},
    {'L', 1, {10, 12, 15, 9, -1, 14, 8, 11, 13}},
    {'F', 2, {16, 17, 18, 19, -1, 20, 21, 22, 23}},
    {'D', 5, {24, 25, 26, 27, -1, 28, 29, 30, 31}},
    {'R', 4, {37, 35, 32, 38, -1, 33, 39, 36, 34}},
    {'B', 3, {47, 46, 45, 44, -1, 43, 42, 41, 40}},
}};

std::string generatedModule() {
  std::ostringstream output;
  output << "// Generated from the C++ Cuboslav engine. Do not edit by "
            "hand.\n";
  output << "export type Face = 'U' | 'L' | 'F' | 'D' | 'R' | 'B';\n";
  output << "export type Move = `${Face}${'' | '2' | \"'\"}`;\n";
  output << "export type Sticker = 0 | 1 | 2 | 3 | 4 | 5;\n\n";
  output << "export interface FaceLayout {\n"
            "  readonly name: Face;\n"
            "  readonly center: Sticker;\n"
            "  readonly stickers: readonly (number | null)[];\n"
            "}\n\n";
  output
      << "// Browser output is compiled to web/dist/generated/cube-data.js.\n";
  output << "export const solvedState = [";
  for (std::size_t i = 0; i < rubikoslav::detail::solvedCube.size(); ++i) {
    if (i != 0)
      output << ',';
    output << rubikoslav::detail::solvedCube[i];
  }
  output << "] as const satisfies readonly Sticker[];\n\n";
  output << "export const faceLayouts = [\n";
  for (std::size_t faceIndex = 0; faceIndex < faceLayouts.size(); ++faceIndex) {
    const auto &face = faceLayouts[faceIndex];
    output << "  {\"name\":\"" << face.name << "\",\"center\":" << face.center
           << ",\"stickers\":[";
    for (std::size_t stickerIndex = 0; stickerIndex < face.stickers.size();
         ++stickerIndex) {
      if (stickerIndex != 0)
        output << ',';
      if (face.stickers[stickerIndex] < 0)
        output << "null";
      else
        output << face.stickers[stickerIndex];
    }
    output << "]}" << (faceIndex + 1 == faceLayouts.size() ? "\n" : ",\n");
  }
  output << "] as const satisfies readonly FaceLayout[];\n\n";
  output << "export const movePermutations = {\n";

  for (const char code : rubikoslav::detail::moves) {
    rubikoslav::Cuboslav cube;
    for (std::size_t i = 0; i < cube.cube.size(); ++i) {
      cube.cube[i] = static_cast<short>(i);
    }
    const rubikoslav::Move move(code);
    cube.turn(move);
    output << "  \"" << move.notation() << "\": [";
    for (std::size_t i = 0; i < cube.cube.size(); ++i) {
      if (i != 0)
        output << ',';
      output << cube.cube[i];
    }
    output << "]" << (code == 'R' ? "\n" : ",\n");
  }
  output << "} as const satisfies Record<Move, readonly number[]>;\n";
  return output.str();
}

std::string readFile(const std::filesystem::path &path) {
  std::ifstream input(path, std::ios::binary);
  if (!input)
    return {};
  return {std::istreambuf_iterator<char>(input),
          std::istreambuf_iterator<char>()};
}

} // namespace

int main(int argc, char **argv) {
  const bool check = argc == 3 && std::string(argv[1]) == "--check";
  const int pathArgument = check ? 2 : 1;
  if (argc != pathArgument + 1) {
    std::cerr << "Usage: WebDataGeneratorovich [--check] <output.ts>\n";
    return 2;
  }

  const std::filesystem::path path(argv[pathArgument]);
  const auto generated = generatedModule();
  if (check) {
    if (readFile(path) != generated) {
      std::cerr << path << " is stale; run the generate-web-data target\n";
      return 1;
    }
    return 0;
  }

  std::filesystem::create_directories(path.parent_path());
  std::ofstream output(path, std::ios::binary | std::ios::trunc);
  if (!output) {
    throw std::runtime_error("Could not write " + path.string());
  }
  output << generated;
  std::cout << "Generated " << path << '\n';
  return 0;
}
