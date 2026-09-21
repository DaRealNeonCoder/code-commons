export const DEFAULT_SHADER = `void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec3 color = vec3(uv.x, uv.y, 0.5);

    fragColor = vec4(color, 1.0);
}
`;
