// Periodic-plus-smooth correction for image-generated albedo maps.
// Solve the periodic Poisson equation for boundary mismatch, subtract the
// smooth lighting bias, then match the remaining edge samples in narrow bands.
// Input/output are RGB8 byte streams; PNG/alpha/metadata stay in the caller.
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#if __has_include(<fftw3.h>)
#include <fftw3.h>
#else
// The stable FFTW3 C ABI subset also works with the runtime library installed
// by ImageMagick when a development-header package is unavailable.
extern "C" {
typedef double fftw_complex[2];
typedef struct fftw_plan_s* fftw_plan;
void* fftw_malloc(size_t);
void fftw_free(void*);
fftw_plan fftw_plan_dft_2d(int, int, fftw_complex*, fftw_complex*, int, unsigned);
void fftw_execute(const fftw_plan);
void fftw_destroy_plan(fftw_plan);
}
#endif

int main(int argc, char** argv) {
    try {
        if (argc != 6) throw std::runtime_error("usage: periodize-rgb width height axes input.rgb output.rgb");
        const int w = std::stoi(argv[1]), h = std::stoi(argv[2]);
        const std::string axes = argv[3];
        if (w < 2 || h < 2 || w > 2048 || h > 2048 || axes.find_first_not_of("xy") != std::string::npos)
            throw std::runtime_error("invalid texture dimensions or axes");
        const size_t n = size_t(w) * h;
        std::vector<unsigned char> input(n * 3), output(n * 3);
        std::ifstream source(argv[4], std::ios::binary);
        source.read(reinterpret_cast<char*>(input.data()), input.size());
        if (size_t(source.gcount()) != input.size()) throw std::runtime_error("incomplete RGB input");
        auto* spatial = static_cast<fftw_complex*>(fftw_malloc(sizeof(fftw_complex) * n));
        auto* spectral = static_cast<fftw_complex*>(fftw_malloc(sizeof(fftw_complex) * n));
        if (!spatial || !spectral) throw std::runtime_error("FFT allocation failed");
        auto forward = fftw_plan_dft_2d(h, w, spatial, spectral, -1, 1U << 6);
        auto backward = fftw_plan_dft_2d(h, w, spectral, spatial, 1, 1U << 6);
        if (!forward || !backward) throw std::runtime_error("FFT planning failed");
        const bool x_axis = axes.find('x') != std::string::npos;
        const bool y_axis = axes.find('y') != std::string::npos;
        constexpr double pi = 3.14159265358979323846;
        std::vector<double> periodic(n);
        for (int channel = 0; channel < 3; ++channel) {
            for (size_t p = 0; p < n; ++p) spatial[p][0] = spatial[p][1] = 0;
            if (y_axis) for (int x = 0; x < w; ++x) {
                const double d = double(input[((h - 1) * w + x) * 3 + channel]) - input[x * 3 + channel];
                spatial[x][0] += d;
                spatial[(h - 1) * w + x][0] -= d;
            }
            if (x_axis) for (int y = 0; y < h; ++y) {
                const double d = double(input[(y * w + w - 1) * 3 + channel]) - input[y * w * 3 + channel];
                spatial[y * w][0] += d;
                spatial[y * w + w - 1][0] -= d;
            }
            fftw_execute(forward);
            for (int y = 0; y < h; ++y) for (int x = 0; x < w; ++x) {
                const size_t p = size_t(y) * w + x;
                if (!x && !y) { spectral[p][0] = spectral[p][1] = 0; continue; }
                const double denominator = 2 * std::cos(2 * pi * x / w) + 2 * std::cos(2 * pi * y / h) - 4;
                spectral[p][0] /= denominator;
                spectral[p][1] /= denominator;
            }
            fftw_execute(backward);
            for (size_t p = 0; p < n; ++p) periodic[p] = input[p * 3 + channel] - spatial[p][0] / double(n);
            if (x_axis) for (int y = 0; y < h; ++y) {
                const double d = (periodic[y * w + w - 1] - periodic[y * w]) / 2;
                const int band = std::max(1, w / 16);
                for (int x = 0; x < band; ++x) {
                    const double weight = std::pow(1 - double(x) / band, 2);
                    periodic[y * w + x] += d * weight;
                    periodic[y * w + w - 1 - x] -= d * weight;
                }
            }
            if (y_axis) for (int x = 0; x < w; ++x) {
                const double d = (periodic[(h - 1) * w + x] - periodic[x]) / 2;
                const int band = std::max(1, h / 16);
                for (int y = 0; y < band; ++y) {
                    const double weight = std::pow(1 - double(y) / band, 2);
                    periodic[y * w + x] += d * weight;
                    periodic[(h - 1 - y) * w + x] -= d * weight;
                }
            }
            for (size_t p = 0; p < n; ++p) output[p * 3 + channel] = static_cast<unsigned char>(std::lround(std::clamp(periodic[p], 0.0, 255.0)));
        }
        fftw_destroy_plan(forward);
        fftw_destroy_plan(backward);
        fftw_free(spatial);
        fftw_free(spectral);
        std::ofstream target(argv[5], std::ios::binary);
        target.write(reinterpret_cast<const char*>(output.data()), output.size());
        if (!target) throw std::runtime_error("could not write RGB output");
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
