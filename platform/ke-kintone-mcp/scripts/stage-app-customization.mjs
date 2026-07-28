import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  toUpdateSettings,
  verifyStagedFile,
} from "./lib/customization-verification.mjs";
import { createKintoneRestClient } from "./lib/kintone-rest.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const appId = argument("app");
const filePath = argument("file");
const target = argument("target") ?? "desktop";

if (!/^[1-9]\d*$/u.test(appId ?? "")) {
  console.error("App ID must be a positive integer.");
  process.exit(1);
}
if (!filePath) {
  console.error("--file is required.");
  process.exit(1);
}
if (!["desktop", "mobile"].includes(target)) {
  console.error("--target must be desktop or mobile.");
  process.exit(1);
}

const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const absoluteFilePath = path.resolve(invocationDirectory, filePath);
const fileName = path.basename(absoluteFilePath);
const file = await readFile(absoluteFilePath);
const client = createKintoneRestClient({ allowApiToken: false });
const previewPath = `/k/v1/preview/app/customize.json?app=${appId}`;

const before = await client.request(previewPath);
const existingSameName = (before[target]?.js ?? []).some(
  (entry) => entry.type === "FILE" && entry.file?.name === fileName,
);
if (existingSameName && !process.argv.includes("--replace-existing")) {
  throw new Error(
    `${fileName} already exists in ${target}.js. Re-run with --replace-existing only after replacement is approved.`,
  );
}

const form = new FormData();
form.append("file", new Blob([file], { type: "text/javascript" }), fileName);
const upload = await client.request("/k/v1/file.json", {
  method: "POST",
  body: form,
});
if (!upload.fileKey) throw new Error("Upload File did not return fileKey.");

const pending = toUpdateSettings(before);
const targetEntries = pending[target].js;
const existingIndex = (before[target]?.js ?? []).findIndex(
  (entry) => entry.type === "FILE" && entry.file?.name === fileName,
);
const newEntry = { type: "FILE", file: { fileKey: upload.fileKey } };
if (existingIndex >= 0) targetEntries.splice(existingIndex, 1, newEntry);
else targetEntries.push(newEntry);

const update = await client.request("/k/v1/preview/app/customize.json", {
  method: "PUT",
  body: {
    app: appId,
    revision: before.revision,
    ...pending,
  },
});
if (!update.revision) throw new Error("Update Customization did not return revision.");

const after = await client.request(previewPath);
let verification;
try {
  verification = verifyStagedFile({
    before,
    after,
    target,
    fileName,
    fileSize: file.byteLength,
    updateRevision: update.revision,
  });
} catch (error) {
  const observed = (after[target]?.js ?? []).map((entry) => ({
    type: entry.type,
    name: entry.file?.name,
    contentType: entry.file?.contentType,
    size: entry.file?.size,
    url: entry.url,
  }));
  throw new Error(
    `Customization read-back failed. PUT revision=${update.revision}; ` +
      `GET revision=${after.revision}; target=${target}.js; ` +
      `expected=${fileName} (${file.byteLength} bytes); ` +
      `observed=${JSON.stringify(observed)}. ${error.message}`,
  );
}

console.log(
  JSON.stringify(
    {
      verified: true,
      app: appId,
      revisionBefore: String(before.revision),
      ...verification,
      note: "Customization is staged in preview and has not been deployed.",
    },
    null,
    2,
  ),
);
