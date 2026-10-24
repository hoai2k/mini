#version 330
#extension GL_ARB_separate_shader_objects : require

#include <minecraft:fog.glsl>
#include <minecraft:globals.glsl>
#include <minecraft:texture_sampling.glsl>
#include <minecraft:oit.glsl>
#include <minecraft:terrainglobals.glsl>
#ifndef MULTIDRAW_TERRAIN
    #include <minecraft:chunksection.glsl>
#endif
#define SMOOTH_FRAGMENT
#include <smoothcraft:lighting.glsl>

uniform sampler2D Sampler0;

layout(location = 0) in float sphericalVertexDistance;
layout(location = 1) in float cylindricalVertexDistance;
layout(location = 2) in vec4 vertexColor;
layout(location = 3) in vec2 texCoord0;
layout(location = 4) in float chunkVisibility;
layout(location = 5) in vec3 viewPos;
layout(location = 6) in vec3 vertexNormal;
layout(location = 7) in vec2 lightLevel;
layout(location = 8) flat in int material;
layout(location = 9) in float hasNormal;
layout(location = 10) in vec3 lightmapColor;

#ifndef OIT_ALPHA_ONLY
layout(location = 0) out vec4 fragColor;
#endif

vec4 calculateFinalColor(vec4 color) {
    #ifdef OIT_ACCUMULATE
    color = sampleColorForAccumulation(color);
    vec4 fogColor = vec4(FogColor.rgb * color.a, FogColor.a);
    #else
    vec4 fogColor = FogColor;
    #endif
    return apply_fog(color, sphericalVertexDistance, cylindricalVertexDistance, FogEnvironmentalStart, FogEnvironmentalEnd, FogRenderDistanceStart, FogRenderDistanceEnd, fogColor);
}

#ifndef OIT_ALPHA_ONLY
vec4 smoothLit(vec4 color) {
    // The flat face normal, from the screen-space slope of the surface.
    vec3 faceNormal = normalize(cross(dFdx(viewPos), dFdy(viewPos)));
    if (dot(faceNormal, viewPos) > 0.0) {
        faceNormal = -faceNormal;
    }
    vec3 n = faceNormal;
    if (hasNormal > 0.5) {
        vec3 vn = normalize(vertexNormal);
        n = dot(vn, faceNormal) > -0.2 ? vn : faceNormal;
    }
    int m = clamp(material, 0, SMOOTH_MATERIAL_COUNT - 1);
    if (m == SMOOTH_MAT_WATER) {
        vec3 worldPos = viewPos - CameraOffset + vec3(CameraBlockPos);
        n = smooth_water_normal(worldPos, GameTime * 1200.0, n);
    } else {
        n = smooth_bump(Sampler0, texCoord0, 1.0 / vec2(TextureSize), n, viewPos, SMOOTH_MATERIAL_B[m].y);
    }
    SmoothInput s;
    s.albedo = color.rgb;
    s.alpha = color.a;
    s.normal = n;
    s.viewPos = viewPos;
    s.light = lightLevel;
    s.lightmap = lightmapColor;
    s.material = m;
    return smooth_shade(s, SmoothSunDirection, SmoothSkyColor, SmoothParams);
}
#endif

void main() {
    vec4 color = (UseRgss == 1 ? sampleRGSS(Sampler0, texCoord0, 1.0f / TextureSize) : sampleNearest(Sampler0, texCoord0, 1.0f / TextureSize)) * vertexColor;
    #ifdef ALPHA_CUTOUT
    if (color.a < ALPHA_CUTOUT) {
        discard;
    }
    #endif

    #ifdef OIT_ALPHA_ONLY
    executeAlphaOnlyPhase(gl_FragCoord.z, color.a);
    #else
    if (SmoothParams.w > 0.5) {
        color = smoothLit(color);
    }
    color = mix(FogColor * vec4(1, 1, 1, color.a), color, chunkVisibility);
    fragColor = calculateFinalColor(color);
    #endif
}
