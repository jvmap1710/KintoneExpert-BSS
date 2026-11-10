import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertSecureTls,
  loadEffectiveConfig,
  reportConfigConflicts,
  validateKintoneBaseUrl,
} from "./lib/kintone-rest.mjs";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
const config = await loadEffectiveConfig({ envFilePath: envPath });
const values = config.values;
reportConfigConflicts(config);

if (!config.filePresent) {
  console.error(`Missing ${envPath}. Copy .env.example to .env and set the required key names.`);
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = validateKintoneBaseUrl(values.KINTONE_BASE_URL);
  if (/your-subdomain|example/iu.test(baseUrl.hostname)) {
    throw new Error("KINTONE_BASE_URL still uses the placeholder.");
  }
  assertSecureTls(values);
} catch (error) {
  console.error(`${error.message} Check KINTONE_BASE_URL and TLS settings in ${envPath}.`);
  process.exit(1);
}

const hasPassword = Boolean(values.KINTONE_USERNAME && values.KINTONE_PASSWORD);
const hasToken = Boolean(values.KINTONE_API_TOKEN);
if (hasPassword === hasToken) {
  console.error(
    `Configure exactly one authentication method in ${envPath}: KINTONE_USERNAME + KINTONE_PASSWORD OR KINTONE_API_TOKEN.`,
  );
  process.exit(1);
}

if (hasToken) {
  const tokens = values.KINTONE_API_TOKEN.split(",").map((token) => token.trim());
  if (tokens.length > 9 || tokens.some((token) => !/^[A-Za-z0-9]+$/u.test(token))) {
    console.error(
      `KINTONE_API_TOKEN in ${envPath} must contain 1-9 comma-separated alphanumeric tokens.`,
    );
    process.exit(1);
  }
}

const hasBasicUsername = Boolean(values.KINTONE_BASIC_AUTH_USERNAME);
const hasBasicPassword = Boolean(values.KINTONE_BASIC_AUTH_PASSWORD);
if (hasBasicUsername !== hasBasicPassword) {
  console.error(
    `Configure both KINTONE_BASIC_AUTH_USERNAME and KINTONE_BASIC_AUTH_PASSWORD, or neither, in ${envPath}.`,
  );
  process.exit(1);
}

console.log(
  `Configuration looks valid (${baseUrl.origin}; ${hasPassword ? "username/password" : "API token"} auth). No connection test was run.`,
);
