import { convertHandler, jotHandler } from "./handlers.ts";

const port = parseInt(Deno.env.get("PORT") || "3000");

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // GET /
  if (url.pathname === "/" && req.method === "GET") {
    const name = Deno.env.get("NAME") || "World";
    return new Response(`Hello ${name}!\n`);
  }
  
  // POST /convert
  if (url.pathname === "/convert" && req.method === "POST") {
    return await convertHandler(req);
  }
  
  // POST /jot
  if (url.pathname === "/jot" && req.method === "POST") {
    return await jotHandler(req);
  }
  
  // 404
  return new Response("Not Found", { status: 404 });
}

console.log(`listening on port ${port}`);
Deno.serve({ port }, handler);
