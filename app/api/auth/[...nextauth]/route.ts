// app/api/auth/[...nextauth]/route.ts
// Route handler para NextAuth.js v5

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
