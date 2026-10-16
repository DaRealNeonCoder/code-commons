import { getRequestAccess } from "@/lib/access";
import { MAX_REACT_DEMO_CODE, MAX_REACT_DEMO_COMPILED } from "@/lib/reactDemo";
import { compileReactDemo } from "../../../../../ccreact/src/compiler.js";

// Draft preview validation is authenticated and returns compiled data only.
// The browser never gets a compiler that can resolve arbitrary imports.
export async function POST(request) {
  const { user } = await getRequestAccess(request);
  if (!user) return Response.json({ error: "Sign in to validate React demos." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (typeof body?.code !== "string" || body.code.length > MAX_REACT_DEMO_CODE) {
    return Response.json({ error: "React demo source is too large or invalid." }, { status: 400 });
  }
  try {
    const compiled = await compileReactDemo(body.code, { maxSourceChars: MAX_REACT_DEMO_CODE, maxCompiledChars: MAX_REACT_DEMO_COMPILED });
    return Response.json({ compiled });
  } catch (error) {
    return Response.json({ error: error.message || "React demo validation failed." }, { status: 400 });
  }
}
