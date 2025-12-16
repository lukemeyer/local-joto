#!/usr/bin/env -S deno run --allow-net --allow-write --allow-read

/**
 * Joto Filesystem Dump Tool
 * 
 * Downloads all files from a Joto device (MongooseOS) filesystem
 * Usage: deno run --allow-net --allow-write --allow-read dump_joto_fs.ts <ip_address>
 */

const ip = Deno.args[0];

if (!ip) {
  console.error("Usage: dump_joto_fs.ts <ip_address>");
  console.error("Example: dump_joto_fs.ts 192.168.1.100");
  Deno.exit(1);
}

const baseUrl = `http://${ip}`;
const outputDir = "./fsdump";

interface FileEntry {
  name: string;
  size: number;
}

interface ListResponse {
  files: FileEntry[];
}

interface GetResponse {
    data: string;
}

async function listFiles(path: string = ""): Promise<FileEntry[]> {
    console.log(`Listing files in: ${path || "/"}`);
    
    const body = path ? { path } : { path: "/" };
    
    const response = await fetch(`${baseUrl}/rpc/FS.List`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        //body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const result: ListResponse = await response.json();
    return result || [];
}

async function getFile(filename: string): Promise<string> {
    console.log(`Downloading: ${filename}`);
    
  const response = await fetch(`${baseUrl}/rpc/FS.Get`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get file ${filename}: ${response.statusText}`);
  }

  const result: GetResponse = await response.json();
  return atob(result.data);
}

async function downloadFile(filename: string, localPath: string) {
  try {
    const content = await getFile(filename);
    
    // Create parent directories if needed
    const dir = localPath.substring(0, localPath.lastIndexOf("/"));
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
    }
    
    await Deno.writeTextFile(localPath, content);
    console.log(`✓ Saved: ${localPath}`);
  } catch (error) {
    console.error(`✗ Failed to download ${filename}:`, error.message);
  }
}

async function processDirectory(dirPath: string = "") {
  try {
    const files = await listFiles(dirPath);
    
    for (const file of files) {
      const fullPath = dirPath ? `${dirPath}/${file}` : `/${file}`;
      const localPath = `${outputDir}${fullPath}`;
      
      // Check if it's a directory (size -1 or name ends with /)
      if (file.size === -1 || file.endsWith("/")) {
        // It's a directory, recurse into it
        const subDirPath = file.endsWith("/") 
          ? fullPath.slice(0, -1)  // Remove trailing slash
          : fullPath;
        
        await processDirectory(subDirPath);
      } else {
        // It's a file, download it
        await downloadFile(fullPath, localPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

// Main execution
console.log(`Joto Filesystem Dump Tool`);
console.log(`Target: ${baseUrl}`);
console.log(`Output: ${outputDir}`);
console.log(`---`);

try {
  // Create output directory
  await Deno.mkdir(outputDir, { recursive: true });
  
  // Start recursive download from root
  await processDirectory("mnt");
  
  console.log(`---`);
  console.log(`Download complete! Files saved to: ${outputDir}`);
} catch (error) {
  console.error(`Fatal error:`, error.message);
  Deno.exit(1);
}
