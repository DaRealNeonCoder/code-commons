import { visit } from "unist-util-visit";

const TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];

// Turns:
//   > [!WARNING]
//   > some text
// into:
//   <Callout type="warning">some text</Callout>
//
// This is the easiest authoring format for people who aren't used to
// writing JSX — it's just a blockquote with a marker on the first line.
export default function remarkCallouts() {
  return (tree) => {
    visit(tree, "blockquote", (node) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== "paragraph") return;
      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== "text") return;

      const match = /^\[!(\w+)\]\s*/.exec(firstText.value);
      if (!match || !TYPES.includes(match[1].toUpperCase())) return;

      const type = match[1].toLowerCase();
      firstText.value = firstText.value.slice(match[0].length);
      if (firstText.value === "") {
        firstChild.children.shift();
      }

      node.type = "mdxJsxFlowElement";
      node.name = "Callout";
      node.attributes = [{ type: "mdxJsxAttribute", name: "type", value: type }];
    });
  };
}
