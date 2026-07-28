const baseUrl = process.env.KINTONE_BASE_URL;
const username = process.env.KINTONE_USERNAME;
const password = process.env.KINTONE_PASSWORD;
const apiToken = process.env.KINTONE_API_TOKEN;

if (!baseUrl) {
  console.error("Connection test requires KINTONE_BASE_URL.");
  process.exit(1);
}

const hasPassword = Boolean(username && password);
const hasToken = Boolean(apiToken);

if (hasPassword === hasToken) {
  console.error(
    "Configure exactly one authentication method: username/password OR KINTONE_API_TOKEN.",
  );
  process.exit(1);
}

const headers = hasPassword
  ? {
      "X-Cybozu-Authorization": Buffer.from(
        `${username}:${password}`,
        "utf8",
      ).toString("base64"),
    }
  : { "X-Cybozu-API-Token": apiToken };
const endpoint = new URL("/k/v1/apps.json?limit=1", baseUrl);

try {
  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.code || body.message) {
        message += ` (${[body.code, body.message].filter(Boolean).join(": ")})`;
      }
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    console.error(`Kintone connection failed: ${message}`);
    process.exit(1);
  }

  const body = await response.json();
  const count = Array.isArray(body.apps) ? body.apps.length : 0;
  console.log(
    `Kintone connection succeeded with ${hasPassword ? "username/password" : "API token"} auth; ` +
      `read access confirmed (${count} app returned by probe).`,
  );
} catch (error) {
  console.error(`Kintone connection failed: ${error.message}`);
  process.exit(1);
}
