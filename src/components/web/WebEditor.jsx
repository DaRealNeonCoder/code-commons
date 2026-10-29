"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

function FileTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 font-mono text-sm transition-colors ${
        active
          ? "border-orange-400 text-orange-400"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function WebEditor({
  html,
  css,
  js,
  onHtmlChange,
  onCssChange,
  onJsChange,
}) {
  const [activeFile, setActiveFile] = useState("html");

  const content = {
    html,
    css,
    js,
  };

  const handleChange = {
    html: onHtmlChange,
    css: onCssChange,
    js: onJsChange,
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900">
      {/* File tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950">
        <FileTab
          label="HTML"
          active={activeFile === "html"}
          onClick={() => setActiveFile("html")}
        />
        <FileTab
          label="CSS"
          active={activeFile === "css"}
          onClick={() => setActiveFile("css")}
        />
        <FileTab
          label="JavaScript"
          active={activeFile === "js"}
          onClick={() => setActiveFile("js")}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          language={activeFile === "html" ? "html" : activeFile === "css" ? "css" : "javascript"}
          value={content[activeFile]}
          onChange={(value) => {
            if (value !== undefined) {
              handleChange[activeFile](value);
            }
          }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', monospace",
            lineNumbersMinChars: 2,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
