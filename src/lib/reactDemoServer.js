import { compileReactDemo } from "../../ccreact/src/compiler.js";
import {
  MAX_REACT_DEMO_CODE,
  MAX_REACT_DEMO_COMPILED,
  MAX_REACT_DEMOS,
  MAX_REACT_DEMO_LESSON_PAYLOAD,
  MAX_REACT_DEMO_TITLE,
  serializeReactDemoArtifacts,
} from "./reactDemo.js";

export async function validateReactDemos(value) {
  if (value == null) return { ok: true, artifacts: [] };
  if (!Array.isArray(value) || value.length > MAX_REACT_DEMOS) return { ok: false, error: "Too many React demos." };

  const artifacts = [];
  let total = 0;
  for (const demo of value) {
    if (!demo || typeof demo !== "object") return { ok: false, error: "A React demo is invalid." };
    if (demo.title != null && (typeof demo.title !== "string" || demo.title.length > MAX_REACT_DEMO_TITLE)) {
      return { ok: false, error: "A React demo title is invalid." };
    }
    const title = typeof demo.title === "string" ? demo.title.trim() : "";
    const code = typeof demo.code === "string" ? demo.code : "";
    if (!code.trim()) continue;
    if (code.length > MAX_REACT_DEMO_CODE) return { ok: false, error: "React demo source is too large." };
    try {
      const compiled = await compileReactDemo(code, { maxSourceChars: MAX_REACT_DEMO_CODE, maxCompiledChars: MAX_REACT_DEMO_COMPILED });
      total += title.length + compiled.length;
      if (total > MAX_REACT_DEMO_LESSON_PAYLOAD) return { ok: false, error: "The React demo lesson payload is too large." };
      artifacts.push({ title, compiled });
      if (serializeReactDemoArtifacts(artifacts).length > MAX_REACT_DEMO_LESSON_PAYLOAD) return { ok: false, error: "The React demo lesson payload is too large." };
    } catch (error) {
      return { ok: false, error: `React demo validation failed: ${error.message}` };
    }
  }
  return { ok: true, artifacts };
}
