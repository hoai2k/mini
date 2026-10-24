// Smoothcraft's surface lighting for terrain.
//
// Vanilla bakes all light into one lightmap colour per vertex. Here that colour
// stays the ambient (it already knows the time of day, the brightness slider,
// night vision, the Nether and the End), shaped by the surface normal, and on
// top come a real sun and moon (direction from the sky renderer), specular
// highlights and sky reflections from each surface's material, light through
// leaves and snow, wet surfaces in the rain, and self-lit materials. Shadows
// are approximated from sky access: a surface the sky can't see gets no sun.
#ifndef SMOOTHCRAFT_LIGHTING_GLSL
#define SMOOTHCRAFT_LIGHTING_GLSL

#include <smoothcraft:materials.glsl>

const float SMOOTH_PI = 3.14159265;

// The normal smuggled through the lightmap coordinate (see NormalPacking.java).
vec3 smooth_unpack_normal(int blockHalf, int skyHalf) {
    vec2 o = vec2((blockHalf >> 8) & 0x7F, (skyHalf >> 8) & 0x7F) / 127.0 * 2.0 - 1.0;
    vec3 n = vec3(o, 1.0 - abs(o.x) - abs(o.y));
    if (n.z < 0.0) {
        n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
    }
    return normalize(n);
}

// The fixed per-direction darkening vanilla bakes into block vertex colours
// (CardinalLighting, blended by normal as Indigo does), so it can be divided out.
float smooth_cardinal_shade(vec3 n, bool nether) {
    vec3 a = abs(n);
    float up = nether ? 0.9 : 1.0;
    float down = nether ? 0.9 : 0.5;
    float sum = a.x * 0.6 + a.z * 0.8 + (n.y > 0.0 ? n.y * up : -n.y * down);
    return sum / max(a.x + a.y + a.z, 1e-4);
}

vec3 smooth_to_linear(vec3 c) {
    return pow(max(c, vec3(0.0)), vec3(2.2));
}

vec3 smooth_to_srgb(vec3 c) {
    return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
}

// Narkowicz's ACES filmic curve.
vec3 smooth_tonemap(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float smooth_luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Everything below shades fragments; the vertex shader only needs the helpers above.
#ifdef SMOOTH_FRAGMENT

// Tangent frame from screen-space derivatives (no tangents in the vertex data).
mat3 smooth_cotangent_frame(vec3 n, vec3 p, vec2 uv) {
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, n);
    vec3 dp1perp = cross(n, dp1);
    vec3 t = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 b = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(t, t), dot(b, b)) + 1e-30);
    return mat3(t * invmax, b * invmax, n);
}

// Detail normal: the texture's brightness read as height, so cracks, grain
// and pebbles catch the light. Stronger for rough materials.
vec3 smooth_bump(sampler2D tex, vec2 uv, vec2 texel, vec3 n, vec3 viewPos, float strength) {
    if (strength <= 0.0) {
        return n;
    }
    vec4 c0 = texture(tex, uv);
    vec4 cu = texture(tex, uv + vec2(texel.x, 0.0));
    vec4 cv = texture(tex, uv + vec2(0.0, texel.y));
    float h0 = smooth_luma(c0.rgb);
    // Clear texels (leaf gaps, plant outlines) have no height: don't read their black as a cliff.
    float hu = cu.a < 0.5 ? h0 : smooth_luma(cu.rgb);
    float hv = cv.a < 0.5 ? h0 : smooth_luma(cv.rgb);
    vec2 slope = vec2(hu - h0, hv - h0) * strength * 1.6;
    mat3 tbn = smooth_cotangent_frame(n, viewPos, uv);
    vec3 bumped = normalize(tbn * vec3(-slope, 1.0));
    return dot(bumped, n) > 0.2 ? bumped : n;
}

// Small moving ripples on top of water.
vec3 smooth_water_normal(vec3 worldPos, float time, vec3 n) {
    if (n.y < 0.5) {
        return n;
    }
    vec2 p = worldPos.xz;
    float dx = 0.0;
    float dz = 0.0;
    dx += cos(p.x * 1.3 + p.y * 0.4 + time * 1.7) * 0.040;
    dz += cos(p.y * 1.1 - p.x * 0.5 + time * 1.3) * 0.040;
    dx += cos(p.x * 3.7 - p.y * 2.1 + time * 2.9) * 0.018;
    dz += cos(p.y * 4.3 + p.x * 1.7 - time * 3.1) * 0.018;
    dx += cos((p.x + p.y) * 9.0 + time * 5.0) * 0.006;
    dz += cos((p.x - p.y) * 8.0 - time * 4.6) * 0.006;
    return normalize(vec3(-dx, 1.0, -dz));
}

float smooth_ggx(float nh, float rough) {
    float a = rough * rough;
    float a2 = a * a;
    float d = nh * nh * (a2 - 1.0) + 1.0;
    return a2 / (SMOOTH_PI * d * d + 1e-6);
}

float smooth_smith(float nv, float nl, float rough) {
    float k = (rough + 1.0) * (rough + 1.0) / 8.0;
    return (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
}

vec3 smooth_fresnel(float cosTheta, vec3 f0, float rough) {
    return f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - cosTheta, 5.0);
}

// One light's specular contribution (Cook-Torrance, GGX).
vec3 smooth_specular(vec3 n, vec3 v, vec3 l, float rough, vec3 f0) {
    vec3 h = normalize(v + l);
    float nl = max(dot(n, l), 0.0);
    float nv = max(dot(n, v), 1e-3);
    float nh = max(dot(n, h), 0.0);
    vec3 f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
    return smooth_ggx(nh, rough) * smooth_smith(nv, nl, rough) * f / (4.0 * nv + 1e-4) ;
}

struct SmoothInput {
    vec3 albedo;        // sRGB surface colour: texture x tint x AO, with vanilla's directional shade removed
    float alpha;
    vec3 normal;        // final shading normal
    vec3 viewPos;       // position relative to the camera
    vec2 light;         // block light, sky light (0..1)
    vec3 lightmap;      // vanilla's lightmap colour for this vertex (sRGB)
    int material;
};

// Returns the lit colour in sRGB (before fog), and adjusts alpha for water.
vec4 smooth_shade(SmoothInput s, vec4 sunDirection, vec4 skyColor, vec4 params) {
    int m = clamp(s.material, 0, SMOOTH_MATERIAL_COUNT - 1);
    vec4 matA = SMOOTH_MATERIAL_A[m];
    vec4 matB = SMOOTH_MATERIAL_B[m];
    float rough = matA.x;
    float metal = matA.y;
    float sss = matA.w;
    float emissive = matB.x;
    float sheen = matB.z;

    vec3 n = s.normal;
    vec3 v = normalize(-s.viewPos);
    vec3 l = normalize(sunDirection.xyz);
    float daylight = sunDirection.w * params.x;
    float rain = skyColor.a;
    float blockLight = s.light.x;
    float skyLight = s.light.y;

    vec3 albedo = smooth_to_linear(s.albedo);
    // Rain soaks exposed surfaces: darker and glossier.
    float wet = rain * matB.w * smoothstep(0.75, 1.0, skyLight) * params.x;
    albedo *= 1.0 - 0.35 * wet;
    rough = mix(rough, rough * 0.35, wet);

    // Ambient: vanilla's light, shaped by which way the surface faces the sky.
    vec3 lm = smooth_to_linear(s.lightmap);
    float hemi = mix(0.55, 1.0, n.y * 0.5 + 0.5);
    float ambientScale = mix(1.15, 0.8, daylight);
    vec3 ambient = lm * mix(1.0, hemi, skyLight) * ambientScale;

    // Sun and moon, only where the sky reaches (a stand-in for shadows).
    float skyVisible = smoothstep(0.6, 0.97, skyLight);
    vec3 sunColor = mix(vec3(1.0, 0.42, 0.18), vec3(1.0, 0.95, 0.88), smoothstep(0.0, 0.35, l.y));
    sunColor *= 1.15 * daylight * (1.0 - 0.8 * rain) * skyVisible;
    vec3 moonColor = vec3(0.10, 0.13, 0.22) * (1.0 - sunDirection.w) * params.x * (1.0 - 0.6 * rain) * skyVisible;
    vec3 moonDir = -l;

    float nl = dot(n, l);
    float wrapped = max((nl + sss) / (1.0 + sss), 0.0);
    // Light passing through leaves, grass blades, snow and ice when the sun is behind them.
    float through = sss * pow(max(dot(v, -l), 0.0), 4.0) * 0.8;
    vec3 direct = sunColor * (wrapped + through) + moonColor * max(dot(n, moonDir), 0.0);

    vec3 f0 = mix(vec3(matA.z), albedo, metal);
    vec3 diffuse = albedo * (ambient + direct) * (1.0 - metal);

    // Highlights from the sun and moon.
    vec3 spec = smooth_specular(n, v, l, rough, f0) * sunColor * max(nl, 0.0)
        + smooth_specular(n, v, moonDir, rough, f0) * moonColor * max(dot(n, moonDir), 0.0);

    // Reflected sky on glossy surfaces, and the glow of nearby torches on them.
    float nv = max(dot(n, v), 0.0);
    vec3 fresnel = smooth_fresnel(nv, f0, rough);
    float gloss = pow(1.0 - rough, 3.0);
    vec3 skyLinear = smooth_to_linear(skyColor.rgb) * (0.25 + 0.75 * daylight);
    vec3 reflection = fresnel * gloss * (skyLinear * skyLight * params.x + lm * 0.35);

    // Soft fibre highlight on cloth and grass at grazing angles.
    vec3 fibres = sheen * pow(1.0 - nv, 4.0) * (ambient + direct) * 0.5 * albedo;

    vec3 glow = albedo * emissive * (0.8 + 0.6 * blockLight);

    vec3 color = diffuse + spec + reflection + fibres + glow;
    float alpha = s.alpha;
    if (m == SMOOTH_MAT_WATER) {
        // Water: mostly what it reflects, more opaque at grazing angles.
        float f = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
        color = mix(albedo * (ambient + direct) * 0.6, skyLinear * skyLight * params.x + lm * 0.15, f) + spec;
        alpha = mix(alpha, 1.0, f * 0.8);
    }
    return vec4(smooth_to_srgb(smooth_tonemap(color)), alpha);
}

#endif // SMOOTH_FRAGMENT

#endif
