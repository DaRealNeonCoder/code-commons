# Computer Graphics & Shaders course

The course deliberately keeps two workflows available from the first lesson:

| Workflow | Use it for | What the learner writes |
| --- | --- | --- |
| Shader art | Pixels, gradients, SDFs, animation, noise, ray marching, and small analytic ray tracers | One fragment shader with `main()` and `fragColor` |
| Programmable 3D | Meshes, vertices, cameras, multiple objects, materials, and CPU-side interaction | `setup(engine)`, a vertex shader, and a fragment shader |

## Supported engine contract used by the lessons

The programmable runner currently supports:

- `engine.scene.add/remove/clear` and object `position`, `rotation`, and
  `scale` vectors.
- `engine.geometry.cube()`, `.plane()`, `.triangle()`, and
  `.from({ positions, normals, uvs, indices })`.
- `engine.material({ uniforms, vertex, fragment })`, where `vertex` and `fragment` name project shader files.
- `engine.camera.position`, `.target`, `.fov`, `.near`, `.far`, and
  `.lookAt(x, y, z)`.
- Engine uniforms `u_model`, `u_view`, `u_projection`, `u_cameraPosition`,
  `u_time`, and `u_resolution`.
- Attributes `a_position`, `a_normal`, and `a_uv`, with interpolation through
  the vertex and fragment stages.
- `update({ time, delta, frame, input })`, where pointer values are normalized.

The fragment-only runtime supplies `iResolution`, `iTime`, `iTimeDelta`,
`iFrame`, `iMouse`, and `iCamera`, and owns the full-screen triangle and its
camera controls.

## Necessary improvement made for course content

The static content importer now preserves `runtime: programmable-3d` and its
`sourceFiles` (`cpu`, `vertex`, and `fragment`) when importing shader MDX.
Without that small change, programmable examples could exist on disk but could
not be seeded into the same three-file runner that creator-published lessons
use.

## Explicit future extensions

These are not prerequisites for the current course and are not presented as
supported APIs:

- image or generated textures, `sampler2D`, and configurable nearest/linear
  filtering;
- custom vertex attributes beyond position, normal, and UV;
- shadow maps, framebuffers, multiple passes, post-processing, instancing, and
  asset loading;
- deterministic image grading for programmable-3D projects;
- production-scale ray tracing or global illumination.

The texture lesson teaches UV meaning and procedural materials, while the
lighting lesson uses normals, diffuse/specular terms, and ray-marched shadows
where the current runtime can actually execute them. This keeps the curriculum
truthful to the engine instead of inventing an API for a future renderer.
