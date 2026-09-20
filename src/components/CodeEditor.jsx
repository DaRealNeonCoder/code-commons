"use client";


import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, onChange }) {
console.log("code is", typeof code, code);
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