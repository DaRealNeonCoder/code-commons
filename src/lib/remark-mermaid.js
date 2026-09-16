import { visit } from "unist-util-visit";

// Turns:
//   ```mermaid
//   flowchart TD
//     A --> B
//   ```
// into:
//   <Mermaid chart="flowchart TD\n  A --> B" />
//
// The diagram is rendered client-side by the `mermaid` package (see
// components/mdx/Mermaid.jsx) — deliberately NOT using a server-side
// rendering plugin, since those pull in a full headless browser
// (Playwright) just to draw an SVG.
export default function remarkMermaid() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid") return;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [{ type: "mdxJsxAttribute", name: "chart", value: node.value }],
        children: [],
      };
    });
  };
}
