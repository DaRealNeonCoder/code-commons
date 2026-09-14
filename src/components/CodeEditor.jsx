"use client";

import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, onChange }) {
  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      }}
    />
  );
}