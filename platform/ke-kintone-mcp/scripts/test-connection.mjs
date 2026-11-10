import {
  assertSecureTls,
  buildConnectionProbe,
  createKintoneRestClient,
  KintoneRestError,
  loadEffectiveConfig,
  reportConfigConflicts,
  validateKintoneBaseUrl,
} from "./lib/kintone-rest.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const environment = argument("environment");
const testPlanApproval = argument("approved-test-plan");
const appId = argument("app");
const guestSpaceId = argument("guest-space");
if (environment !== "test") {
  console.error("Connection checks require --environment test.");
  process.exit(1);
}
if (!testPlanApproval?.trim()) {
  console.error(
    "No tenant call was made. Show the named test plan and obtain user approval first; then pass --approved-test-plan <approval-reference>.",
  );
  process.exit(1);
}

const effectiveConfig = await loadEffectiveConfig();
reportConfigConflicts(effectiveConfig);
const env = effectiveConfig.values;
try {
  const baseUrl = validateKintoneBaseUrl(env.KINTONE_BASE_URL);
  if (/your-subdomain|example/iu.test(baseUrl.hostname)) {
    throw new Error("KINTONE_BASE_URL still uses the placeholder.");
  }
  assertSecureTls(env);
  const probe = buildConnectionProbe({ env, appId, guestSpaceId });
  const client = createKintoneRestClient({ env });
  const body = await client.request(probe.path);
  const resultCount = Array.isArray(body.apps)
    ? body.apps.length
    : body.appId
      ? 1
      : 0;
  console.log(
    `Kintone test connection succeeded with ${probe.authKind} auth; ` +
      `read access confirmed for ${probe.guestSpaceId ? `guest space ${probe.guestSpaceId}, ` : ""}` +
      `${probe.appId ? `App ${probe.appId}` : `${resultCount} app(s) returned by the broad password-auth probe`}.`,
  );
} catch (error) {
  if (error instanceof KintoneRestError && error.status === 401) {
    console.error(
      "Kintone rejected the configured authentication (HTTP 401). Check the credentials and supported authentication method; no credential values were printed.",
    );
  } else if (error instanceof KintoneRestError && error.status === 403) {
    console.error(
      "Kintone denied access to the requested API or App (HTTP 403). Check App/guest-space permissions; no credential values were printed.",
    );
  } else {
    console.error(`Kintone test connection failed: ${error.message}`);
  }
  process.exit(1);
}
