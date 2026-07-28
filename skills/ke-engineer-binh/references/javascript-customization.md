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
2. Upload one local file with `POST /k/v1/file.json` using
   `multipart/form-data`; capture the returned `fileKey`.
3. Attach that `fileKey` to the App's pre-live settings with
   `PUT /k/v1/preview/app/customize.json`.
4. Read the pre-live customization settings back and verify the file, scope,
   ordering, App ID, revision, and preserved entries. This is configuration
   verification, not a runtime test.
5. Summarize pending changes and obtain explicit deployment confirmation.
6. Deploy App settings and poll until `SUCCESS`; report any returned failure.
7. Test the customization on the deployed live App with synthetic data and
   report the result. Treat rollback or another deployment as a new change.

The Update Customization API requires Kintone Administrator and App Management
permissions. It supports password, session, or OAuth authentication. API
tokens can authenticate the standalone Upload File call, but cannot be used
with Update Customization; therefore an API-token-only setup cannot complete
this deployment flow. Do not print credentials or place them in commands,
tracked manifests, logs, or generated output.

Treat customization arrays as complete ordered settings: preserve existing
files unless the user explicitly approves their removal or replacement.
Validate configuration before deploy and runtime behavior after deploy.
JavaScript file creation is not evidence that the file was uploaded, attached,
deployed, or verified.

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
