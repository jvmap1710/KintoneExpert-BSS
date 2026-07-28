import { createKintoneRestClient } from "./lib/kintone-rest.mjs";

const hasPassword = Boolean(
  process.env.KINTONE_USERNAME && process.env.KINTONE_PASSWORD,
);

try {
  const client = createKintoneRestClient();
  const body = await client.request("/k/v1/apps.json?limit=1");
  const count = Array.isArray(body.apps) ? body.apps.length : 0;
  console.log(
    `Kintone connection succeeded with ${hasPassword ? "username/password" : "API token"} auth; ` +
      `read access confirmed (${count} app returned by probe).`,
  );
} catch (error) {
  console.error(`Kintone connection failed: ${error.message}`);
  process.exit(1);
}
