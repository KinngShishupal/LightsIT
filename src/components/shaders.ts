// SkSL runtime shaders. Kept as plain strings so they can be compile-checked
// outside React Native (see scripts/check-shaders.mjs).

// Deep-space backdrop: drifting nebula glow, twinkling stars, faint scanlines.
export const BACKDROP_SKSL = `
uniform float2 res;
uniform float time;
uniform float energy;

float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

half4 main(float2 p) {
  float2 uv = p / res;
  float aspect = res.x / res.y;
  float2 q = float2(uv.x * aspect, uv.y);
  float t = time * 0.06;

  float3 col = mix(float3(0.012, 0.016, 0.05), float3(0.03, 0.02, 0.085), uv.y);

  float2 c1 = float2((0.18 + 0.12 * sin(t * 1.3)) * aspect, 0.22 + 0.10 * cos(t));
  float2 c2 = float2((0.86 + 0.10 * cos(t * 0.9)) * aspect, 0.72 + 0.12 * sin(t * 1.1));
  float2 c3 = float2((0.50 + 0.20 * sin(t * 0.7)) * aspect, 1.05 + 0.05 * cos(t * 1.7));
  float d1 = length(q - c1);
  float d2 = length(q - c2);
  float d3 = length(q - c3);
  float boost = 1.0 + energy * 0.9;
  col += float3(0.00, 0.42, 0.62) * exp(-d1 * d1 * 7.0) * 0.30 * boost;
  col += float3(0.55, 0.10, 0.48) * exp(-d2 * d2 * 6.0) * 0.26 * boost;
  col += float3(0.70, 0.38, 0.05) * exp(-d3 * d3 * 9.0) * 0.16 * boost;

  float cellSize = 26.0;
  float2 g = floor(p / cellSize);
  float h = hash(g);
  float2 jitter = float2(fract(h * 7.13), fract(h * 3.71)) - 0.5;
  float2 f = fract(p / cellSize) - 0.5 - jitter * 0.7;
  float twinkle = 0.55 + 0.45 * sin(time * (0.8 + h * 2.5) + h * 40.0);
  float star = smoothstep(0.07, 0.0, length(f)) * step(0.86, h) * twinkle;
  col += float3(0.75, 0.82, 1.0) * star * 0.85;

  col *= 0.94 + 0.06 * sin(p.y * 1.4);
  col *= 1.0 - 0.55 * length(uv - 0.5);
  return half4(half3(col), 1.0);
}
`;
