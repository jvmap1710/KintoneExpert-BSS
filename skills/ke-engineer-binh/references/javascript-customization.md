# JavaScript and CSS customization

Kintone supports attaching JavaScript and CSS files to an App through its
administration UI and official REST APIs. The current Kintone MCP server may
not expose customization upload tools. That is an MCP capability gap, not a
Kintone platform limitation.

## Execution choices

Use the active `kintone` MCP tool directly when it exposes the required
customization operation. Otherwise explain the gap and ask the user to choose:

1. use the official Kintone REST API with explicit approval (recommended for
   an automated build);
2. upload through the Kintone administration UI; or
3. use Kintone's official customize-uploader workflow.

Do not inspect `node_modules` to invent an MCP tool. Do not silently switch to
REST just because an MCP call failed. If MCP is loaded but does not publish a
customization operation, starting a new chat will not create that tool. Once
the user approves REST for the named App and customization operation, proceed
through the scoped REST flow below; do not keep returning to channel review.

## What preview means

In Kintone customization APIs, `preview` means the App's pre-live settings.
It is a configuration staging area, not a second runnable App and not a URL
where the form can be opened. Records cannot be created against those pending
settings, and the pending JavaScript/CSS cannot be runtime-tested there.

Use two distinct validation gates:

1. **Before deploy:** run local syntax/static tests, read the pre-live
   customization settings back, and verify App ID, revision, file keys, scope,
   ordering, and all preserved entries.
2. **After deploy:** only after deployment reaches `SUCCESS`, open or exercise
   the live App and test the customization with synthetic data.

## Approved REST API flow

For a user-approved REST path:

1. Read the current pre-live customization settings with the preview endpoint
   and preserve existing JavaScript/CSS entries and their order.
2. Use the Kit's shared staging command rather than generating a new
   authentication/uploader script:

   `npm --prefix platform/ke-kintone-mcp run customization:stage -- --app
   <APP_ID> --file <JS_PATH> --target desktop`

   Add `--replace-existing` only when replacement of the same named file was
   explicitly approved.
3. The command must use password authentication through the shared REST
   helper, upload one file, attach it with the latest baseline revision, and
   read the preview settings back.
4. Verify the returned PUT revision equals the GET preview revision; verify
   target, `type: FILE`, file name, content type, size, scope, ordering, and
   preservation of existing entries. Do not require the temporary Upload File
   `fileKey` to equal the stored `fileKey` returned by Get Customization.
   This is configuration verification, not a runtime test.
5. Summarize pending changes and obtain explicit deployment confirmation.
6. Deploy App settings and poll until `SUCCESS`; report any returned failure.
7. Generate and return the exact live App URL from `KINTONE_BASE_URL` with the
   runtime `app:url` command; never substitute a tenant placeholder.
8. Test the customization on the deployed live App with synthetic data and
   report the result. Treat rollback or another deployment as a new change.

MCP and REST are complementary transports. MCP can create/configure the App
while an approved REST call uploads and attaches JavaScript in the same
implementation flow. Prefer adding the customization to the pre-live revision
before the first deployment so the user reviews and deploys one coherent
change set. If the base App is already live, attaching JavaScript changes the
pre-live settings and requires a second reviewed deployment before runtime
testing.

The Update Customization API requires Kintone Administrator and App Management
permissions. It supports password, session, or OAuth authentication. API
tokens can authenticate the standalone Upload File call, but cannot be used
with Update Customization; therefore an API-token-only setup cannot complete
this deployment flow. Do not print credentials or place them in commands,
tracked manifests, logs, or generated output.

Password authentication uses `X-Cybozu-Authorization` with Base64 of
`login_name:password`; it does not use the `Basic` prefix. Optional front-door
Basic Authentication uses a separate `Authorization: Basic ...` header. Never
write either header by hand in a generated project script: import the shared
runtime helper or use `customization:stage`.

Treat customization arrays as complete ordered settings: preserve existing
files unless the user explicitly approves their removal or replacement.
Validate configuration before deploy and runtime behavior after deploy.
JavaScript file creation is not evidence that the file was uploaded, attached,
deployed, or verified.

If read-back fails, report the sanitized HTTP status, Kintone error code, PUT
revision, GET revision, target array, expected filename, and expected size.
Do not send the user to the UI until the REST response has been diagnosed.
Never deploy an unverified preview revision.

## Official references

- Upload File:
  https://kintone.dev/en/docs/kintone/rest-api/files/upload-file/
- Update Customization:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/update-customization/
- Get Customization:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-customization/
- Deploy App Settings:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/deploy-app-settings/
- Get App Deploy Status:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-app-deploy-status/
- Attach scripts through the administration UI:
  https://kintone.dev/en/tutorials/introduction-to-kintone-customizations/how-to-attach-scripts-to-kintone-apps/
- Customize-uploader:
  https://kintone.dev/en/tutorials/tool-guides/upload-javascript-and-css-files-with-customize-uploader/
