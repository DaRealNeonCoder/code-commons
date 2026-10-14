export const DEFAULT_SHADER = `// SHADER CREATOR CHEAT SHEET
// These values are supplied automatically to every fragment shader:
//
// iResolution (vec3) - drawing-buffer width, height, and 1.0. Use .xy for pixels.
// iTime (float)      - seconds since this preview started.
// iTimeDelta (float) - seconds since the previous frame.
// iFrame (int)       - frame counter, starting at 0.
// iMouse (vec4)      - current pointer pixel x/y in .xy and last click x/y in .zw.
//                      The origin is bottom-left; all four values start at 0.
// iCamera (vec3)     - camera world offset in .xy and zoom multiplier in .z.
//                      It starts at (0, 0, 1). Shift-drag/middle-drag pans it,
//                      the wheel or +/- zooms it, and 0 resets it.
//                      Click or Tab into the preview for WASD/arrow movement.
//                      Zoom is limited to 0.2-12; R also resets the camera.
//                      Camera state is temporary and resets on remount.
// gl_FragCoord (vec4) - built-in pixel coordinate for this fragment.
// fragColor (vec4)   - the color this shader must write for the fragment.
// Do not redeclare these uniforms or add #version. Use fragColor on both
// WebGL versions; gl_FragColor is not portable. No iChannel textures supplied.
//
// A centered, aspect-correct coordinate that responds to the camera:
//   vec2 point = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
//   point = point / iCamera.z + iCamera.xy;
//
// Common GLSL tools available include sin, cos, tan, abs, floor, fract, mod,
// min, max, clamp, mix, step, smoothstep, length, distance, dot, normalize,
// pow, exp, log, sqrt, reflect, and refract. Define helper functions above main.

void main() {
    vec2 point = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    point = point / max(iCamera.z, 0.001) + iCamera.xy;

    vec2 mouse = (iMouse.xy / max(iResolution.xy, vec2(1.0)) - 0.5) * 2.0;
    float time = iTime * 0.35;
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float sectors = 9.0;
    float sectorWidth = 6.2831853 / sectors;
    float foldedAngle = abs(mod(angle + 0.5 * sectorWidth, sectorWidth) - 0.5 * sectorWidth);

    // A living neon mandala: pan around it, then zoom into the details.
    float wave = 0.5 + 0.5 * cos(radius * 21.0 - time * 7.0 + sin(angle * sectors + time) * 1.5);
    float spokes = 1.0 - smoothstep(0.0, 0.035, abs(foldedAngle - 0.12 * sin(radius * 5.0 - time * 4.0)));
    float halo = exp(-2.7 * radius) * (0.7 + 0.3 * sin(time * 5.0 + mouse.y));

    vec3 color = vec3(0.003, 0.006, 0.025);
    color += vec3(0.03, 0.12, 0.35) * halo;
    color += vec3(0.05, 0.55, 1.0) * wave * spokes * (0.35 + 0.65 * exp(-radius));
    color += vec3(0.65, 0.08, 0.85) * (1.0 - smoothstep(0.15, 1.1, radius)) * wave * 0.35;

    // Repeating luminous architecture gives the camera something rewarding to explore.
    for (int i = 0; i < 5; i++) {
        float layer = float(i);
        vec2 q = abs(point) - vec2(0.18 + layer * 0.17, 0.12 + layer * 0.09);
        float beam = 1.0 - smoothstep(0.0, 0.018, abs(q.x + 0.035 * sin(q.y * 11.0 + time * 3.0 + layer)));
        color += vec3(0.1, 0.8, 0.95) * beam * exp(-radius * (1.2 + layer * 0.35)) * 0.45;
    }

    float core = 1.0 - smoothstep(0.0, 0.13 + 0.02 * sin(time * 8.0), radius);
    color += vec3(1.0, 0.25, 0.7) * core;
    color = 1.0 - exp(-color * (1.25 + 0.15 * sin(time)));

    fragColor = vec4(color, 1.0);
}
`;
