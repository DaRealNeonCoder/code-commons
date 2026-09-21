// A small, self-contained WebGL layer for a ShaderToy-style playground.
// No abstractions beyond what this actually needs: one runtime object per
// canvas that knows how to (re)compile a user fragment shader and render
// it every frame. Nothing here is a general-purpose graphics engine.

const INTERNAL_VERTEX_SOURCE_GL2 = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const INTERNAL_VERTEX_SOURCE_GL1 = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const UNIFORM_DECLARATIONS = `uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec4 iMouse;
`;

// A fullscreen triangle, deliberately oversized so it gets clipped to
// exactly fill the viewport — cheaper than a two-triangle quad and has no
// diagonal seam.
const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

class ShaderCompileError extends Error {
  constructor(rawLog) {
    super(rawLog || "Shader failed to compile.");
    this.name = "ShaderCompileError";
    this.rawLog = rawLog;
  }
}

// Wraps the user's `void main() { ... }` body into a complete fragment
// shader. Returns the offset (in lines) where the user's code starts, so
// compiler error line numbers can be translated back to "line N of what
// you wrote" instead of line N of the full generated source.
export function wrapFragmentShader(userCode, isWebGL2) {
  if (isWebGL2) {
    // GLSL ES 3.00 has real `out` variables, so the user's own `main()`
    // can be the actual entry point — no rewriting needed.
    const prefix = `#version 300 es
precision highp float;

${UNIFORM_DECLARATIONS}
out vec4 fragColor;

`;
    return { source: prefix + userCode, userCodeStartLine: countLines(prefix) };
  }

  // GLSL ES 1.00 has no `out` variables — the real output is the builtin
  // gl_FragColor. So the user's `main` is renamed and called from a real
  // `main` that copies their result into gl_FragColor. This is the only
  // place user code is rewritten, and only the exact `void main()` token.
  const renamedUserCode = userCode.replace(/void\s+main\s*\(\s*\)/, "void mainCommon()");

  const prefix = `precision highp float;

${UNIFORM_DECLARATIONS}
vec4 fragColor;

`;
  const suffix = `

void main() {
  mainCommon();
  gl_FragColor = fragColor;
}
`;

  return { source: prefix + renamedUserCode + suffix, userCodeStartLine: countLines(prefix) };
}

function countLines(str) {
  return str.split("\n").length - 1;
}

// Rewrites raw driver text like "ERROR: 0:15: 'foo' : undeclared
// identifier" into "Line 3: 'foo' : undeclared identifier" using the
// offset from wrapFragmentShader. If a driver formats errors differently,
// this just leaves the log unchanged rather than producing something
// misleading.
export function friendlyShaderError(rawLog, userCodeStartLine) {
  if (!rawLog) return "Unknown shader error.";

  const rewritten = rawLog.replace(/ERROR:\s*\d+:(\d+):/g, (_match, lineStr) => {
    const line = parseInt(lineStr, 10) - userCodeStartLine;
    return line > 0 ? `Line ${line}:` : "Error:";
  });

  return rewritten.trim();
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new ShaderCompileError(log);
  }
  return shader;
}

function linkProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new ShaderCompileError(log);
  }
  return program;
}

// One of these is created per <canvas>. It owns the GL context, the
// fullscreen triangle, and whichever program last compiled successfully.
// A failed recompile never touches that program, so rendering keeps going
// with the last good shader.
export class ShaderRuntime {
  constructor(canvas) {
    const gl2 = canvas.getContext("webgl2", { alpha: false });
    if (gl2) {
      this.gl = gl2;
      this.isWebGL2 = true;
    } else {
      const gl1 = canvas.getContext("webgl", { alpha: false }) || canvas.getContext("experimental-webgl", { alpha: false });
      if (!gl1) throw new Error("WebGL is not supported in this browser.");
      this.gl = gl1;
      this.isWebGL2 = false;
    }

    const gl = this.gl;

    // The internal vertex shader never changes and isn't user-facing — if
    // this ever fails to compile, that's our bug, not the user's.
    this.vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      this.isWebGL2 ? INTERNAL_VERTEX_SOURCE_GL2 : INTERNAL_VERTEX_SOURCE_GL1
    );

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);

    this.program = null;
    this.uniforms = {};
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frame = 0;
    this.mouse = { x: 0, y: 0, clickX: 0, clickY: 0 };
    this.resolution = { width: canvas.width, height: canvas.height };
  }

  // Attempts to compile+link a new program from the user's `main()` body.
  // Never throws and never tears down the currently active program on
  // failure — returns { success: true } or { success: false, message }.
  setFragmentSource(userCode) {
    const gl = this.gl;
    const { source, userCodeStartLine } = wrapFragmentShader(userCode, this.isWebGL2);

    let fragmentShader;
    try {
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, source);
    } catch (err) {
      return { success: false, message: friendlyShaderError(err.rawLog, userCodeStartLine) };
    }

    let program;
    try {
      program = linkProgram(gl, this.vertexShader, fragmentShader);
    } catch (err) {
      gl.deleteShader(fragmentShader);
      return { success: false, message: friendlyShaderError(err.rawLog, userCodeStartLine) };
    }

    // Only tear down the previous program once the new one has fully
    // succeeded.
    gl.deleteShader(fragmentShader);
    if (this.program) gl.deleteProgram(this.program);

    this.program = program;
    this.uniforms = locateUniforms(gl, program);
    bindPositionAttribute(gl, program, this.positionBuffer);

    return { success: true };
  }

  resize(width, height) {
    this.resolution = { width, height };
    this.gl.viewport(0, 0, width, height);
  }

  updateMouse({ x, y, clickX, clickY }) {
    this.mouse = { x, y, clickX, clickY };
  }

  render(nowMs) {
    const gl = this.gl;
    if (!this.program) return; // nothing has ever compiled successfully yet

    const timeSeconds = (nowMs - this.startTime) / 1000;
    const deltaSeconds = (nowMs - this.lastFrameTime) / 1000;
    this.lastFrameTime = nowMs;

    gl.useProgram(this.program);
    const u = this.uniforms;
    if (u.iResolution) gl.uniform3f(u.iResolution, this.resolution.width, this.resolution.height, 1);
    if (u.iTime) gl.uniform1f(u.iTime, timeSeconds);
    if (u.iTimeDelta) gl.uniform1f(u.iTimeDelta, deltaSeconds);
    if (u.iFrame) gl.uniform1i(u.iFrame, this.frame);
    if (u.iMouse) gl.uniform4f(u.iMouse, this.mouse.x, this.mouse.y, this.mouse.clickX, this.mouse.clickY);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.frame += 1;
  }

  dispose() {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    gl.deleteShader(this.vertexShader);
    gl.deleteBuffer(this.positionBuffer);
  }
}

function locateUniforms(gl, program) {
  return {
    iResolution: gl.getUniformLocation(program, "iResolution"),
    iTime: gl.getUniformLocation(program, "iTime"),
    iTimeDelta: gl.getUniformLocation(program, "iTimeDelta"),
    iFrame: gl.getUniformLocation(program, "iFrame"),
    iMouse: gl.getUniformLocation(program, "iMouse"),
  };
}

function bindPositionAttribute(gl, program, positionBuffer) {
  const location = gl.getAttribLocation(program, "a_position");
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}
