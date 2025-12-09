import { Application, Router } from "./deps.ts";
import { convertHandler, jotHandler } from "./handlers.ts";

const app = new Application();
const router = new Router();

router.get("/", (context) => {
  const name = Deno.env.get("NAME") || "World";
  context.response.body = `Hello ${name}!\n`;
});

router.post("/convert", convertHandler);
router.post("/jot", jotHandler);

app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") || "3000");
console.log(`listening on port ${port}`);
await app.listen({ port });
