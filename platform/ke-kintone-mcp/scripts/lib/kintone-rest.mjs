function encode(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

export function buildKintoneAuthHeaders(
  env = process.env,
  { allowApiToken = true } = {},
) {
  const hasPassword = Boolean(env.KINTONE_USERNAME && env.KINTONE_PASSWORD);
  const hasApiToken = Boolean(env.KINTONE_API_TOKEN);

  if (hasPassword === hasApiToken) {
    throw new Error(
      "Configure exactly one Kintone authentication method: username/password OR API token.",
    );
  }
  if (hasApiToken && !allowApiToken) {
    throw new Error("This Kintone REST operation requires username/password, session, or OAuth.");
  }

  const headers = hasPassword
    ? {
        "X-Cybozu-Authorization": encode(
          `${env.KINTONE_USERNAME}:${env.KINTONE_PASSWORD}`,
        ),
      }
    : { "X-Cybozu-API-Token": env.KINTONE_API_TOKEN };

  const hasBasicUsername = Boolean(env.KINTONE_BASIC_AUTH_USERNAME);
  const hasBasicPassword = Boolean(env.KINTONE_BASIC_AUTH_PASSWORD);
  if (hasBasicUsername !== hasBasicPassword) {
    throw new Error(
      "Configure both KINTONE_BASIC_AUTH_USERNAME and KINTONE_BASIC_AUTH_PASSWORD, or neither.",
    );
  }
  if (hasBasicUsername) {
    headers.Authorization = `Basic ${encode(
      `${env.KINTONE_BASIC_AUTH_USERNAME}:${env.KINTONE_BASIC_AUTH_PASSWORD}`,
    )}`;
  }

  return headers;
}

function getBaseUrl(env) {
  const value = env.KINTONE_BASE_URL;
  if (!value) throw new Error("KINTONE_BASE_URL is required.");

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    throw new Error("KINTONE_BASE_URL must be an HTTPS base URL.");
  }
  return url;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

export function createKintoneRestClient({
  env = process.env,
  fetchImpl = fetch,
  allowApiToken = true,
} = {}) {
  const baseUrl = getBaseUrl(env);
  const authHeaders = buildKintoneAuthHeaders(env, { allowApiToken });

  return {
    async request(path, { method = "GET", body, headers = {} } = {}) {
      const requestHeaders = { ...authHeaders, ...headers };
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      let requestBody = body;

      if (body !== undefined && !isFormData) {
        requestHeaders["Content-Type"] ??= "application/json";
        requestBody = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetchImpl(new URL(path, baseUrl), {
        method,
        headers: requestHeaders,
        body: requestBody,
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        const detail = [data.code, data.message].filter(Boolean).join(": ");
        throw new Error(
          `Kintone REST ${method} ${path} failed: ${response.status} ${response.statusText}` +
            (detail ? ` (${detail})` : ""),
        );
      }
      return data;
    },
  };
}
