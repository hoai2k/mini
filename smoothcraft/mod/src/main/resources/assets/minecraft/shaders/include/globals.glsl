#ifndef MINECRAFT_GLOBALS_GLSL
#define MINECRAFT_GLOBALS_GLSL

// Vanilla's Globals block, plus Smoothcraft's sun and sky values at the end
// (written by SkyState.java through GlobalSettingsUniformMixin).
layout(std140) uniform Globals {
    ivec3 CameraBlockPos;
    float GlintAlpha;
    vec3 CameraOffset;
    float GameTime;
    vec2 ScreenSize;
    int MenuBlurRadius;
    int UseRgss;
    vec4 SmoothSunDirection;
    vec4 SmoothSkyColor;
    vec4 SmoothParams;
};

#endif
