import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIntoStandalone(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(rootDir, sourceRelativePath);

  if (!(await pathExists(sourcePath))) {
    return;
  }

  const targetPath = path.join(standaloneDir, targetRelativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { force: true, recursive: true });
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    return;
  }

  await copyIntoStandalone("public", "public");
  await copyIntoStandalone(path.join(".next", "static"), path.join(".next", "static"));
  await copyIntoStandalone("data", "data");
}

main().catch((error) => {
  console.error("Failed to prepare standalone output.", error);
  process.exitCode = 1;
});
