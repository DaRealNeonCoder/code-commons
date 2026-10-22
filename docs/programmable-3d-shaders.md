# Programmable 3D shaders

Shader projects have two first-class workflows:

- **Simple fragment shader** keeps the original codeloop experience. A project
  has one fragment file, and codeloop supplies the fullscreen vertex shader and
  the familiar `iResolution`, `iTime`, `iMouse`, and `iCamera` uniforms.
- **Programmable 3D scene** is opt-in from the project’s rendering-mode
  selector. It adds one CPU JavaScript file plus separate vertex and fragment
  shader files.

The CPU file runs in a sandboxed, opaque iframe. It cannot use imports,
`require`, cookies, local storage, or network connections. The server applies
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

`engine.material({ uniforms })` uses the project’s vertex and fragment files.
Uniform values may be numbers or arrays of two, three, four, or sixteen
numbers. The engine supplies these uniforms when a shader declares them:

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
Creators can replace either file and add their own attributes/uniforms as long
as the CPU material provides their uniform values.

## Persistence and publishing

The selected mode and all three source files are saved by the normal project
autosave path. Published shader records retain the runtime mode and files, so
reopening a published 3D lesson uses the same runner. Existing records without
the new runtime field are treated as `fragment` and continue through the old
fragment-only runtime.
