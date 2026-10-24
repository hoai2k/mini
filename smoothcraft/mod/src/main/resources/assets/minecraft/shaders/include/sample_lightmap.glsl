#ifndef MINECRAFT_SAMPLE_LIGHTMAP_GLSL
#define MINECRAFT_SAMPLE_LIGHTMAP_GLSL

// As vanilla, except that the bits above the low byte of each coordinate are
// ignored: Smoothcraft packs a vertex normal into them (NormalPacking.java).
vec4 sample_lightmap(sampler2D lightMap, ivec2 uv) {
    uv &= ivec2(0xFF);
    return texture(lightMap, clamp((uv / 256.0) + 0.5 / 16.0, vec2(0.5 / 16.0), vec2(15.5 / 16.0)));
}

#endif
