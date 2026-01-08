import { assertEquals } from "@std/assert";
import { stub, Spy } from "@std/testing/mock";
import { convertHandler, jotHandler } from "./handlers.ts";

Deno.test("convertHandler - returns 400 if no file uploaded", async () => {
  const context = {
    request: {
      body: {
        formData: async () => new Map(),
      },
    },
    response: {
      status: 200,
      body: null,
      headers: new Headers(),
    },
  };

  await convertHandler(context);

  assertEquals(context.response.status, 400);
  assertEquals(context.response.body, "No SVG file uploaded.");
});

Deno.test("convertHandler - processes file and calls svg2gcode", async () => {
  // Mock dependencies
  const mockFile = {
    name: "test.svg",
    stream: () => new Blob(["<svg></svg>"]).stream(),
  };

  const context = {
    request: {
      body: {
        formData: async () => {
          const map = new Map();
          map.set("file", mockFile);
          return map;
        },
      },
    },
    response: {
      status: 200,
      body: null,
      headers: new Headers(),
    },
  };

  // Stub Deno.Command
  const commandStub = stub(Deno, "Command", function MockCommand(_cmd: string, _options: any) {
    return {
      output: () => Promise.resolve({
          code: 0,
          stdout: new TextEncoder().encode("GCODE OUTPUT"),
          stderr: new Uint8Array(),
      }),
    };
  } as any);

  // Stub file system operations to avoid real IO
  const mkdirStub = stub(Deno, "mkdir", () => Promise.resolve());
  const writeFileStub = stub(Deno, "writeFile", () => Promise.resolve());
  const readTextFileStub = stub(Deno, "readTextFile", () => Promise.resolve("GCODE CONTENT"));
  const writeTextFileStub = stub(Deno, "writeTextFile", () => Promise.resolve());
  const readFileStub = stub(Deno, "readFile", () => Promise.resolve(new Uint8Array()));
  const removeStub = stub(Deno, "remove", () => Promise.resolve());

  try {
    await convertHandler(context);

    assertEquals(context.response.headers.get("Content-Disposition"), `attachment; filename="converted.g"`);
  } finally {
    commandStub.restore();
    mkdirStub.restore();
    writeFileStub.restore();
    readTextFileStub.restore();
    writeTextFileStub.restore();
    readFileStub.restore();
    removeStub.restore();
  }
});

Deno.test("jotHandler - returns 400 if no file uploaded", async () => {
  const context = {
    request: {
      body: {
        formData: async () => new Map(),
      },
    },
    response: {
      status: 200,
      body: null,
    },
  };

  await jotHandler(context);

  assertEquals(context.response.status, 400);
  assertEquals(context.response.body, "No GCode file uploaded.");
});

Deno.test("jotHandler - calls fetch to upload file", async () => {
  const mockFile = {
    text: () => Promise.resolve("G0 X10 Y10"),
  };

  const context = {
    request: {
      body: {
        formData: async () => {
          const map = new Map();
          map.set("file", mockFile);
          map.set("baseUrl", "http://mock-joto");
          return map;
        },
      },
    },
    response: {
      body: null,
    },
  };

  // Stub global fetch
  const fetchStub = stub(globalThis, "fetch", () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response));

  try {
    await jotHandler(context);
    assertEquals(context.response.body, "File uploaded successfully.");
  } finally {
    fetchStub.restore();
  }
});
