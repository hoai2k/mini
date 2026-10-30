#version 330
#extension GL_ARB_separate_shader_objects : require

#include <minecraft:fog.glsl>
#include <minecraft:globals.glsl>
#include <minecraft:projection.glsl>
#include <minecraft:sample_lightmap.glsl>
#include <minecraft:terrainglobals.glsl>
#ifndef MULTIDRAW_TERRAIN
    #include <minecraft:chunksection.glsl>
#endif
#include <smoothcraft:lighting.glsl>

layout(location = 0) in vec3 Position;
layout(location = 1) in vec4 Color;
layout(location = 2) in vec2 UV0;
layout(location = 3) in ivec2 UV2;
#ifdef MULTIDRAW_TERRAIN
layout(location = 4) in ivec3 ChunkPosition;
layout(location = 5) in float ChunkVisibility;
#endif

#ifndef OIT_ALPHA_ONLY
uniform sampler2D Sampler2;
#endif

layout(location = 0) out float sphericalVertexDistance;
layout(location = 1) out float cylindricalVertexDistance;
layout(location = 2) out vec4 vertexColor;
layout(location = 3) out vec2 texCoord0;
layout(location = 4) out float chunkVisibility;
layout(location = 5) out vec3 viewPos;
layout(location = 6) out vec3 vertexNormal;
layout(location = 7) out vec2 lightLevel;
layout(location = 8) flat out int material;
layout(location = 9) out float hasNormal;
layout(location = 10) out vec3 lightmapColor;
layout(location = 11) flat out int blendOverlay;
layout(location = 12) out float blendShare;

void main() {
    vec3 pos = Position + (ChunkPosition - CameraBlockPos) + CameraOffset;
    gl_Position = ProjMat * ModelViewMat * vec4(pos, 1.0);

    sphericalVertexDistance = fog_spherical_distance(pos);
    cylindricalVertexDistance = fog_cylindrical_distance(pos);

    // Smoothcraft's extras: the packed normal, and the material in the colour's alpha.
    int blockHalf = UV2.x & 0xFFFF;
    int skyHalf = UV2.y & 0xFFFF;
    ivec2 light = ivec2(blockHalf & 0xFF, skyHalf & 0xFF);
    hasNormal = (blockHalf & 0x8000) != 0 ? 1.0 : 0.0;
    vertexNormal = hasNormal > 0.5 ? smooth_unpack_normal(blockHalf, skyHalf) : vec3(0.0, 1.0, 0.0);
    // Alpha holds 255 - code: low 5 bits the material, top 3 a blend overlay's share (1..7, 0 for none).
    int code = 255 - int(Color.a * 255.0 + 0.5);
    material = code & 31;
    int share = code >> 5;
    blendOverlay = share;
    blendShare = share > 0 ? float(share - 1) / 6.0 : 1.0;
    lightLevel = vec2(light) / 240.0;
    viewPos = pos;
    vec4 color = vec4(Color.rgb, 1.0);
    bool lit = SmoothParams.w > 0.5;

    #ifndef OIT_ALPHA_ONLY
    vec4 lightmap = sample_lightmap(Sampler2, light);
    lightmapColor = lightmap.rgb;
    if (lit) {
        if (hasNormal > 0.5) {
            color.rgb /= max(smooth_cardinal_shade(vertexNormal, SmoothParams.y > 0.5), 0.4);
        }
        vertexColor = color;
    } else {
        vertexColor = color * lightmap;
    }
    #else
    lightmapColor = vec3(1.0);
    vertexColor = color;
    #endif
    texCoord0 = UV0;

    const float chunkFullyVisibleRange = 16.0;
    float dist = length(pos);
    chunkVisibility = mix(1.0, ChunkVisibility, clamp((dist - chunkFullyVisibleRange) / chunkFullyVisibleRange, 0.0, 1.0));
}
