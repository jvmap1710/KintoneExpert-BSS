import {
  loadEffectiveConfig,
  reportConfigConflicts,
  validateKintoneBaseUrl,
} from "./lib/kintone-rest.mjs";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];

  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  return inline?.slice(prefix.length);
}

function requirePositiveInteger(value, label) {
  if (!/^[1-9]\d*$/u.test(value ?? "")) {
    console.error(`${label} must be a positive integer.`);
    process.exit(1);
  }
  return value;
}

const appId = requirePositiveInteger(readArgument("app"), "App ID");
const guestSpaceArgument = readArgument("guest-space");
const guestSpaceId = guestSpaceArgument
  ? requirePositiveInteger(guestSpaceArgument, "Guest Space ID")
  : null;
const effectiveConfig = await loadEffectiveConfig();
reportConfigConflicts(effectiveConfig);
const baseUrl = effectiveConfig.values.KINTONE_BASE_URL;

if (!baseUrl || /your-subdomain|example/iu.test(baseUrl)) {
  console.error("KINTONE_BASE_URL is missing or still uses the placeholder.");
  process.exit(1);
}

let parsedBaseUrl;
try {
  parsedBaseUrl = validateKintoneBaseUrl(baseUrl);
} catch {
  console.error("KINTONE_BASE_URL must be an HTTPS base URL, e.g. https://company.cybozu.com");
  process.exit(1);
}

const path = guestSpaceId
  ? `/k/guest/${guestSpaceId}/${appId}/`
  : `/k/${appId}/`;
console.log(new URL(path, parsedBaseUrl).href);
