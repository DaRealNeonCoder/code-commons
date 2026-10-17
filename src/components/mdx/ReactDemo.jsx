import { compileReactDemo } from "../../../ccreact/src/compiler.js";
import ReactDemoClient from "@/components/mdx/ReactDemoClient";
import {
  MAX_REACT_DEMO_CODE,
  MAX_REACT_DEMO_COMPILED,
  serializeReactDemoArtifacts,
} from "@/lib/reactDemo";

// Official MDX can provide source code directly. Compile it on the server so
// public lessons do not need an authenticated browser validation request.
// Creator previews use ReactDemoClient directly through ReactCodeLoop instead.
export default async function ReactDemo({ code = "", data = "", title = "Interactive React demo", allowValidation = false }) {
  if (data || !code || allowValidation) {
    return <ReactDemoClient code={code} data={data} title={title} allowValidation={allowValidation} />;
  }

  const compiled = await compileReactDemo(code.slice(0, MAX_REACT_DEMO_CODE), {
    maxSourceChars: MAX_REACT_DEMO_CODE,
    maxCompiledChars: MAX_REACT_DEMO_COMPILED,
  });
  const artifactData = serializeReactDemoArtifacts([{ title, compiled }]);
  return <ReactDemoClient data={artifactData} title={title} />;
}
