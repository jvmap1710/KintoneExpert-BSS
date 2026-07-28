# JavaScript and CSS customization

Kintone supports attaching JavaScript and CSS files to an App through its
administration UI and official REST APIs. The current Kintone MCP server may
not expose customization upload tools. That is an MCP capability gap, not a
Kintone platform limitation.

## Execution choices

Use the active `kintone` MCP tool directly when it exposes the required
customization operation. Otherwise explain the gap and ask the user to choose:

1. use the official Kintone REST API with explicit approval;
2. upload through the Kintone administration UI; or
3. use Kintone's official customize-uploader workflow.

Do not inspect `node_modules` to invent an MCP tool. Do not silently switch to
REST just because an MCP call failed.

## Approved REST API flow

For a user-approved REST path:

1. Read the current preview customization settings and preserve existing
   JavaScript/CSS entries and their order.
2. Upload one local file with `POST /k/v1/file.json` using
   `multipart/form-data`; capture the returned `fileKey`.
3. Attach that `fileKey` to the App preview with
   `PUT /k/v1/preview/app/customize.json`.
4. Read the preview customization settings back and verify the file, scope,
   ordering, App ID, and revision.
5. Summarize pending changes and obtain explicit deployment confirmation.
6. Deploy App settings and poll until `SUCCESS`; report any returned failure.

The Update Customization API requires Kintone Administrator and App Management
permissions. It supports password, session, or OAuth authentication. API
tokens cannot be used with Update Customization. Do not print credentials or
place them in commands, tracked manifests, logs, or generated output.

Treat customization arrays as complete ordered settings: preserve existing
files unless the user explicitly approves their removal or replacement. Build
and test in preview first. JavaScript file creation is not evidence that the
file was uploaded, attached, deployed, or verified.

## Official references

- Upload File:
  https://kintone.dev/en/docs/kintone/rest-api/files/upload-file/
- Update Customization:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/update-customization/
- Attach scripts through the administration UI:
  https://kintone.dev/en/tutorials/introduction-to-kintone-customizations/how-to-attach-scripts-to-kintone-apps/
- Customize-uploader:
  https://kintone.dev/en/tutorials/tool-guides/upload-javascript-and-css-files-with-customize-uploader/
