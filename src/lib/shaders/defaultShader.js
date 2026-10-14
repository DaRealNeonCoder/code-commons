export const DEFAULT_SHADER = `// Available uniforms:
// iResolution (vec3) - canvas width and height.
// iTime (float) - elapsed time in seconds.
// iTimeDelta (float) - time since the last frame.
// iFrame (int) - current frame number.
// iMouse (vec4) - mouse position and last click position.
// iCamera (vec3) - camera offset (xy) and zoom (z).
// gl_FragCoord (vec4) - current pixel coordinates.
// fragColor (vec4) - output color.
//
// Coordinates range from 0.0 to 1.0 across the canvas:
//   vec2 uv = gl_FragCoord.xy / iResolution.xy;
//
// Do not redeclare uniforms or add #version.
// Write the output to fragColor. No textures are provided.

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    fragColor = vec4(uv.x, uv.y, 0.5, 1.0);
}
`;