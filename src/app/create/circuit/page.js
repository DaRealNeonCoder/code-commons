"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import LogicSimulator from "@/components/circuits/LogicSimulator";
import FilterFields from "@/components/filters/FilterFields";

const EMPTY_CIRCUIT = {
  components: [],
  connections: [],
  chips: {},
};

export default function CreateCircuitPage() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [circuit, setCircuit] = useState(EMPTY_CIRCUIT);
  const [blocks, setBlocks] = useState([
    newTextBlock({ size: "title", bold: true }),
  ]);
  const [status, setStatus] = useState(null);

  const [areas, setAreas] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [difficulty, setDifficulty] = useState("");

  const markdown = useMemo(
    () => blocksToMarkdown(blocks),
    [blocks]
  );

  async function handleSave() {
    setStatus("saving");

    try {
      const res = await fetch("/api/circuit-lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          summary,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          starterCircuit: circuit,
          content: markdown,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  return React.createElement(
    "div",
    {
      className: "w-full h-full overflow-y-auto px-6 py-12",
    },
    React.createElement(
      "div",
      {
        className: "mx-auto max-w-4xl",
      },

      React.createElement(
        Link,
        {
          href: "/create",
          className:
            "font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
        },
        "← /create"
      ),

      React.createElement(
        "p",
        {
          className:
            "mt-3 font-mono text-sm text-blue-600 dark:text-blue-400",
        },
        "/create/circuit"
      ),

      React.createElement(
        "h1",
        {
          className: "mt-1 text-2xl font-semibold",
        },
        "Create a circuit lesson"
      ),

      React.createElement(
        "p",
        {
          className: "mt-1 text-zinc-600 dark:text-zinc-400",
        },
        "Build the starting circuit, then add the lesson text below."
      ),

      // Lesson details
      React.createElement(
        "section",
        {
          className:
            "mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800",
        },

        React.createElement(
          "h2",
          {
            className: "mb-4 font-mono text-sm text-zinc-500",
          },
          "lesson details"
        ),

        React.createElement(
          "label",
          {
            className: "block text-sm font-medium",
            htmlFor: "circuit-title",
          },
          "Title"
        ),

        React.createElement("input", {
          id: "circuit-title",
          value: title,
          onChange: (e) => setTitle(e.target.value),
          placeholder: "e.g. Your First NAND Gate",
          className:
            "mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950",
        }),

        React.createElement(
          "label",
          {
            className: "block text-sm font-medium",
            htmlFor: "circuit-summary",
          },
          "Summary"
        ),

        React.createElement("input", {
          id: "circuit-summary",
          value: summary,
          onChange: (e) => setSummary(e.target.value),
          placeholder: "One line shown in the circuit lesson list",
          className:
            "mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950",
        }),

        React.createElement(FilterFields, {
          areas,
          onAreasChange: setAreas,
          topics,
          onTopicsChange: setTopics,
          tags,
          onTagsChange: setTags,
          languageMode: "multi",
          languages,
          onLanguagesChange: setLanguages,
          difficulty,
          onDifficultyChange: setDifficulty,
        })
      ),

      // Starter circuit
      React.createElement(
        "section",
        {
          className:
            "mt-6 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800",
        },

        React.createElement(
          "h2",
          {
            className:
              "border-b border-zinc-200 px-4 py-2 font-mono text-sm text-zinc-500 dark:border-zinc-800",
          },
          "starter circuit"
        ),

        React.createElement(
          "div",
          {
            className: "h-[32rem]",
          },
          React.createElement(LogicSimulator, {
            compact: true,
            initialCircuit: circuit,
            onChange: setCircuit,
          })
        )
      ),

      React.createElement(TextBlockEditor, {
        blocks: blocks,
        onChange: setBlocks,
        accent: "blue",
      }),

      // Markdown preview
      React.createElement(
        "details",
        {
          className:
            "mt-6 rounded-md border border-zinc-200 p-4 dark:border-zinc-800",
        },

        React.createElement(
          "summary",
          {
            className:
              "cursor-pointer select-none font-mono text-sm text-zinc-500",
          },
          "preview generated markdown"
        ),

        React.createElement(
          "pre",
          {
            className:
              "mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300",
          },
          markdown || "(nothing yet)"
        )
      ),

      // Save button
      React.createElement(
        "div",
        {
          className: "mt-6 flex items-center gap-3",
        },

        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleSave,
            disabled: status === "saving" || !title.trim() || !difficulty,
            className:
              "rounded-md bg-blue-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50",
          },
          status === "saving"
            ? "saving..."
            : "$ save circuit lesson"
        ),

        status &&
          status.ok &&
          React.createElement(
            "p",
            {
              className:
                "text-sm text-teal-600 dark:text-teal-400",
            },
            `Saved as "${status.ok}".`
          ),

        status &&
          status.error &&
          React.createElement(
            "p",
            {
              className:
                "text-sm text-red-600 dark:text-red-400",
            },
            status.error
          )
      )
    )
  );
}