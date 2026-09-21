"use client";

import Editor from "@monaco-editor/react";

// Monaco has no built-in GLSL language. This registers just enough of a
// Monarch tokenizer to make a `void main() { ... }` body readable — types,
// keywords, the ShaderToy-style uniforms, common built-in functions,
// numbers, and comments. It's intentionally not a full GLSL grammar.
function registerGlslLanguage(monaco) {
  const alreadyRegistered = monaco.languages.getLanguages().some((lang) => lang.id === "glsl");
  if (alreadyRegistered) return;

  monaco.languages.register({ id: "glsl" });

  monaco.languages.setMonarchTokensProvider("glsl", {
    keywords: [
      "if", "else", "for", "while", "do", "return", "break", "continue",
      "discard", "struct", "const", "in", "out", "inout", "true", "false",
    ],
    types: [
      "void", "bool", "int", "uint", "float",
      "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
      "bvec2", "bvec3", "bvec4", "mat2", "mat3", "mat4",
      "sampler2D", "samplerCube",
    ],
    builtins: [
      "iResolution", "iTime", "iTimeDelta", "iFrame", "iMouse",
      "gl_FragCoord", "gl_FragColor", "fragColor",
      "sin", "cos", "tan", "abs", "floor", "ceil", "fract", "mod",
      "min", "max", "clamp", "mix", "step", "smoothstep", "length",
      "distance", "dot", "cross", "normalize", "pow", "exp", "log",
      "sqrt", "reflect", "refract",
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\d+\.\d+([eE][-+]?\d+)?/, "number.float"],
        [/\d+/, "number"],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@types": "type",
              "@builtins": "predefined",
              "@default": "identifier",
            },
          },
        ],
        [/[{}()[\]]/, "@brackets"],
        [/[<>]=?|[!=]=|&&|\|\|/, "operator"],
      ],
    },
  });
}

// `code` / `onChange` naming matches the existing CodeEditor component for
// consistency, even though this is a separate component — shaders don't
// need CodeEditor's language switcher or run button, just Monaco itself.
export default function ShaderEditor({ code, onChange }) {
  return (
    <Editor
      language="glsl"
      theme="vs-dark"
      value={code}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      beforeMount={registerGlslLanguage}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
