import { Application, Router } from "./deps.ts";
import { beginCommand, endCommand, penOnCommand, penOffCommand } from "./jotoCommands.ts";

const app = new Application();
const router = new Router();

router.get("/", (context) => {
  const name = Deno.env.get("NAME") || "World";
  context.response.body = `Hello ${name}!\n`;
});

router.post("/convert", async (context) => {
  const body = await context.request.body.formData();
  const file = body.get("file");
  const destPath = `uploads/${file.name}`;
  const fileData = await file.stream()
  Deno.writeFile(destPath, fileData);
  //const file = body.files?.find((file) => file.filename?.endsWith(".svg"));

  if (!file) {
    context.response.status = 400;
    context.response.body = "No SVG file uploaded.";
    return;
  }

  const svgFilePath = destPath;
  const gcodeFilePath = svgFilePath + ".g";
  
  const command = new Deno.Command(Deno.cwd() + "/svg2gcode/svg2gcode", {
    // args: [
    //   '--help'
    // ],
    args: [
      //'svg2gcode',
      svgFilePath,
      '--dimensions','250mm,250mm',
      '--tolerance','0.1',
      '--feedrate','8000',
      '--begin', beginCommand,
      '--end', endCommand,
      '--off', penOffCommand,
      '--on', penOnCommand,
      '-o', gcodeFilePath,
     ],
  });
  const { code, stdout, stderr } = await command.output();
  
  if (code !== 0) {
    console.error(`Error executing svg2gcode: ${new TextDecoder().decode(stderr)}`);
    context.response.status = 500;
    context.response.body = "Error converting SVG to GCODE.";
    return;
  } else {
    console.log(`Converted SVG to GCODE: ${new TextDecoder().decode(stdout)}`);
  }

  let gcode = await Deno.readTextFile(gcodeFilePath);
  gcode = gcode.replace(/\s*;.*$/gm, '');
  gcode = gcode.replace(/^\s*$/gm, '');

  await Deno.writeTextFile(gcodeFilePath, gcode);

  context.response.headers.set("Content-Disposition", `attachment; filename="converted.g"`);
  context.response.body = await Deno.readFile(gcodeFilePath);

  await Deno.remove(gcodeFilePath);
  await Deno.remove(svgFilePath);
});

router.post("/jot", async (context) => {
  const body = await context.request.body.formData();
  const baseUrl = body.get("baseUrl");
  const file = body.get("file");
  // const fileData = await file.stream()


  if (!file) {
    context.response.status = 400;
    context.response.body = "No GCode file uploaded.";
    return;
  }

  // const decoder = new TextDecoder("utf-8");
  // const content = decoder.decode(file.arrayBuffer());
  const content = await file.text();
  await putFile("jot.g", baseUrl, content);

  // jot a file from the filesystem
  console.log('Calling /rpc/SAM3XDL  ...');
  await fetch(baseUrl + '/rpc/SAM3XDL', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: `/mnt/jot.g` }),
  });

  context.response.body = "File uploaded successfully.";
});


async function putFile(filename: string, baseUrl: string, content: string) {
  console.log('Calling /rpc/FS.Put  ...');
  
  const chunks = content.match(/(?=[\s\S])(?:.*\n?){1,40}/g) || [];
  
  console.log('File uploading in ' + chunks.length + ' chunks');
  
  await putChunks(chunks, filename, baseUrl, false);
}

async function putChunks(chunks: string[], filename: string, baseUrl: string, append: boolean) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const response = await fetch(baseUrl + '/rpc/FS.Put', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename: `/mnt/${filename}`, append: append, data: btoa(chunk) }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk ${i + 1}`);
    }

    append = true;
    //wait 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`Chunk ${i + 1} uploaded successfully`);
  }

  console.log('File upload...success');
}

app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") || "3000");
console.log(`listening on port ${port}`);
await app.listen({ port });
