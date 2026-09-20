import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// This one file handles every auth endpoint: /api/auth/sign-in, the OAuth
// callbacks, sign-out, session lookup, etc. Don't rename the [...all] folder.
export const { GET, POST } = toNextJsHandler(auth);
