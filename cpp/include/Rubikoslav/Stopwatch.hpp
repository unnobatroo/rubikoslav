
#include <chrono>

#ifndef RUBIKOSLAV_TIMER_HPP
#define RUBIKOSLAV_TIMER_HPP

class Stopwatch {
public:
  Stopwatch() : start(std::chrono::high_resolution_clock::now()) {}

  long long GetElapsedTime() {
    auto end = std::chrono::high_resolution_clock::now();
    auto duration =
        std::chrono::duration_cast<std::chrono::microseconds>(end - start)
            .count();
    return duration;
  }

  long long Restart() {
    auto end = std::chrono::high_resolution_clock::now();
    auto duration =
        std::chrono::duration_cast<std::chrono::microseconds>(end - start)
            .count();

    start = std::chrono::high_resolution_clock::now();

    return duration;
  }

private:
  std::chrono::time_point<std::chrono::high_resolution_clock> start;
};

#endif // RUBIKOSLAV_TIMER_HPP
