import { existsSync, readFileSync } from "node:fs";

const envFile = ".env";

if (!existsSync(envFile)) {
  console.error("Missing .env. Copy .env.example to .env and fill in Kintone credentials.");
  process.exit(1);
}

const values = Object.create(null);
for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/u)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, "$2");
  values[key] = value;
}

const baseUrl = values.KINTONE_BASE_URL;
if (!baseUrl || /your-subdomain|example/u.test(baseUrl)) {
  console.error("KINTONE_BASE_URL is missing or still uses the placeholder.");
  process.exit(1);
}

try {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/") {
    throw new Error();
  }
} catch {
  console.error("KINTONE_BASE_URL must be an HTTPS base URL, e.g. https://company.cybozu.com");
  process.exit(1);
}

const hasPassword = Boolean(values.KINTONE_USERNAME && values.KINTONE_PASSWORD);
const hasToken = Boolean(values.KINTONE_API_TOKEN);

if (hasPassword === hasToken) {
  console.error(
    "Configure exactly one authentication method: username/password OR KINTONE_API_TOKEN.",
  );
  process.exit(1);
}

if (hasToken) {
  const tokens = values.KINTONE_API_TOKEN.split(",");
  if (tokens.length > 9 || tokens.some((token) => !/^[A-Za-z0-9]+$/u.test(token.trim()))) {
    console.error(
      "KINTONE_API_TOKEN must contain 1-9 comma-separated alphanumeric tokens.",
    );
    process.exit(1);
  }
}

console.log(`Configuration looks valid (${hasPassword ? "username/password" : "API token"} auth).`);
