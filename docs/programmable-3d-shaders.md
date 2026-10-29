# Programmable 3D shaders

Shader projects have two first-class workflows:

- **Simple fragment shader** keeps the original codeloop experience. A project
  has one fragment file, and codeloop supplies the fullscreen vertex shader and
  the familiar `iResolution`, `iTime`, `iMouse`, and `iCamera` uniforms.
- **Programmable 3D scene** is opt-in from the project’s rendering-mode
  selector. It holds any number of JavaScript scripts, vertex shaders, and
  fragment shaders. See [Multiple files](#multiple-files).

Scripts run in a sandboxed, opaque iframe. They cannot use `import`/`export`,
cookies, local storage, or network connections. They can load other project
scripts with `require`. The server applies
source-size limits before saving or publishing, and the preview reports errors
with the file/stage that failed.

## Small working example

Select **Programmable 3D scene**. The new project is populated with this
example, which rotates a lit cube:

```js
function setup(engine) {
  const cube = engine.scene.add({
    geometry: engine.geometry.cube(),
    material: engine.material({
      uniforms: { u_color: [0.35, 0.65, 1.0] },
    }),
  });

  engine.camera.position.set(0, 0, 4.5);

  return {
    update({ time, delta }) {
      cube.rotation.y += delta * 0.9;
      cube.rotation.x = Math.sin(time * 0.8) * 0.25;
    },
  };
}
```

The built-in `cube`, `plane`, and `triangle` geometry helpers provide position,
normal, UV, and index buffers. `scene.add()` accepts `geometry`, `material`,
`position`, `rotation`, and `scale`. Transform vectors have `.set(x, y, z)`
and can also be changed by assigning `.x`, `.y`, and `.z`.

Generated meshes can use `engine.geometry.from({ positions, normals, uvs,
indices })`. `positions` and `indices` are required flat arrays; normals and UVs
default to zeroes when omitted. Custom meshes are bounded to 300,000 flat
position/index entries and 65,535 vertices per geometry.

`engine.material({ vertex, fragment, uniforms })` picks shaders by file name.
Without `vertex` or `fragment`, the first `.vert` or `.frag` file in the project
is used. Uniform values may be numbers or arrays of two, three, four, or
sixteen numbers. The engine supplies these uniforms when a shader declares them:

| Uniform | Meaning |
| --- | --- |
| `u_model` | Current object transform matrix |
| `u_view` | Camera view matrix |
| `u_projection` | Perspective projection matrix |
| `u_cameraPosition` | Camera position as `vec3` |
| `u_time` | Seconds since the scene started |
| `u_resolution` | Drawing-buffer width, height, and `1` |

The default vertex shader uses `a_position`, `a_normal`, and `a_uv`; the
default fragment shader receives `v_normal`, `v_uv`, and `v_worldPosition`.
Creators can replace either file. The runner currently binds only
`a_position`, `a_normal`, and `a_uv`; it does not provide arbitrary custom
vertex attributes. CPU materials may provide numeric float uniforms, but not
samplers or textures yet.

This boundary is intentional for the first course: procedural materials can
still use UVs, time, normals, and uniforms, while texture loading, filtering,
shadow maps, and extra vertex attributes remain optional future engine work.

## Multiple files

Each file’s type comes from its extension:

| Extension | Kind | Notes |
| --- | --- | --- |
| `.js` | Script | Runs on the CPU side. Limit 30,000 characters. |
| `.vert` | Vertex shader | GLSL ES. Limit 20,000 characters. |
| `.frag` | Fragment shader | GLSL ES. Limit 20,000 characters. |

`scene.js` is the entry point and must define `setup(engine)`. Project limits
are 24 files and 150,000 characters in total. File names use letters, numbers,
`-` and `_`, may include folders separated by `/`, and must end in one of the
extensions above.

Scripts load each other with `require`, relative to the project root:

```js
// scene.js
const { spin } = require("./lib/motion.js");

function setup(engine) {
  const cube = engine.scene.add({
    geometry: engine.geometry.cube(),
    material: engine.material({
      vertex: "shaders/glow.vert",
      fragment: "shaders/glow.frag",
      uniforms: { u_color: [1.0, 0.6, 0.2] },
    }),
  });
  return { update({ time }) { cube.rotation.y = spin(time); } };
}
```

```js
// lib/motion.js
module.exports.spin = (time) => time * 0.8;
```

A `require` of a missing file, or a `material` that names a missing shader,
reports an error on the file that caused it. Each script runs once, and the
exports of a script are shared with every script that requires it.

## Persistence and publishing

The selected mode and all three source files are saved by the normal project
autosave path. Published shader records retain the runtime mode and files, so
reopening a published 3D lesson uses the same runner. Existing records without
the new runtime field are treated as `fragment` and continue through the old
fragment-only runtime.
