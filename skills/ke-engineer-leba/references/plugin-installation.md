# Native plugin selection and installation

Source review: 2026-11-18. Read the relevant entries in the
[native plugin catalog](../../ke-sa-laude/references/native-plugin-catalog.md)
before proposing a plugin. Catalog documentation is not runtime verification.

## Scope and current capability

A plugin is installed in the **Kintone tenant**, then added/configured for
individual **Apps**. A Space groups Apps; it is not a plugin installation target.
For “install for this Space”, resolve the exact approved App IDs first. Do not
attach the plugin to every App in that Space or scan unrelated Spaces by default.

The [official MCP published tool list](https://github.com/kintone/mcp-server/blob/main/README_en.md#tools)
reviewed on this date has no install/add-plugin tool. Recheck the actual session
tools when executing; do not invent names or interpret a disabled tool as an
upstream gap. An approved official REST or administration-UI path can fill a
genuine gap. A custom policy restriction must not be bypassed.

This Kit currently has REST staging helpers for customization and Process
Management, **not a plugin install/stage command**. This reference adds
knowledge, not an executable installer. Do not claim `plugin:install` exists,
reuse another operation's authorization, or generate ad-hoc credential headers.
When authorized to install, use an available approved administration UI via
Playwright, or implement and verify a narrowly scoped shared REST helper under
the existing authentication/authorization conventions before using REST. Report
missing tooling honestly; approval alone does not make the tool available.

## Supported platform operations

| Step | Official operation | Permissions / authentication | Evidence |
| --- | --- | --- | --- |
| Upload selected package | [Upload File](https://kintone.dev/en/docs/kintone/rest-api/files/upload-file/) | Check documented authentication for the chosen path | Temporary fileKey; not installed yet |
| Install in tenant | [Install Plug-in](https://kintone.dev/en/docs/kintone/rest-api/plugins/add-plugin/), POST `/k/v1/plugin.json` with fileKey | Kintone Administrator; password or session, not API token | Returned plugin ID/version plus read-back |
| Update installed package | [Update Plug-in](https://kintone.dev/en/docs/kintone/rest-api/plugins/update-plugin/), PUT `/k/v1/plugin.json` with id/fileKey | Kintone Administrator; password or session | Requires explicit update scope and impact review, not an install retry |
| Add existing plugin to App | [Add Plug-ins](https://kintone.dev/en/docs/kintone/rest-api/apps/settings/add-app-plugins/), POST `/k/v1/preview/app/plugins.json` | App Management; password, API token or session | Read back App plugin list and revision before deployment |
| Configure behavior | Plugin's documented settings UI | Authorized App administrator and required plugin prerequisites | Reopen settings and compare field mapping/rules |
| Publish and verify | Approved App deployment, status polling, browser tests | Existing Kit deploy/test gates | Deploy SUCCESS and actual scoped runtime evidence |

Guest App API path is documented in Add Plug-ins; endpoint support does not
override an individual plugin's Guest compatibility restriction.
[Set Config](https://kintone.dev/en/docs/kintone/js-api/plugins/set-config/) is
a JavaScript API available on the desktop Plug-in Settings page, not a generic
REST configuration endpoint. Config keys are plugin-specific; do not guess them
or inject undocumented calls. Prefer the supplied settings interface.

## Execution contract

1. **Inspect within scope.** Resolve project, tenant/environment, App IDs and
   normal/Guest Space. Check installed plugin ID/version, App associations,
   current settings, relevant scripts/plugins and current deployment state.
   Use official read operations/UI; request only missing material target scope.
2. **Select and prepare.** Read the selected release's documentation and terms;
   obtain its package from the official source. Record plugin name/ID/version,
   source URL, download date and SHA-256 of the selected file. A locally computed
   hash identifies the file; it does not prove publisher authenticity. Keep the
   package/config evidence project-local and ignored, not in the shared Kit.
   If registration/download consent is required, explain it; do not submit a
   user's contact details or accept new terms without authority.
3. **Present concrete changes.** Name tenant install versus reuse/update,
   target Apps, plugin version, mapping/conditions/events, expected record writes,
   dependency/conflict checks, channels and rollback. Installing a package has
   tenant scope even when only one App is requested. If a version is already
   installed, prefer reuse when suitable; updates can affect other using Apps
   and require their impact to be assessed before approval.
4. **Execute authorized steps.** Existing explicit approval for the concrete
   scope carries forward; do not repeatedly ask the same question. A KB request,
   recommendation, credentials, Space creation or generic build approval does
   not implicitly authorize tenant plugin installation/update. No bulk installs.
5. **Configure and read back.** Add only the approved IDs to the named Apps,
   preserve unrelated plugins/settings, use the latest App revision where
   supported. Map actual field types/codes, conditions, notifications and
   destination Apps through the documented UI. Distinguish package installed,
   App attached and configuration verified. Do not claim configured from an
   HTTP success alone.
6. **Deploy and test.** Summarize pending changes and follow the separate deploy
   approval gate. Poll to SUCCESS; then use Playwright for the actual affected
   journey. Respect approval for synthetic records and cross-App side effects.
   Check true/false conditions, missing fields, roles and scoped mobile/Guest
   paths. For browser-dependent logic, API-created records do not demonstrate
   the browser behavior. Include API/import paths when requirements need them.
   Complete the existing LeBa→Mit Quick Verification routine; full smoke testing
   remains separately scoped and approved.
7. **Report and recover.** Return plugin ID/version, App URLs/revisions,
   configuration evidence, runtime results and untested paths. On error, inspect
   state before retrying; no blind reupload/update. Preserve prior configuration
   for recovery and explain whether recovery is App-local or tenant-wide. Never
   uninstall a shared plugin, delete data or downgrade it as an automatic fix.

Use [Get Installed Plug-ins](https://kintone.dev/en/docs/kintone/rest-api/plugins/get-plugins/),
[Get App Plug-ins](https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-app-plugins/)
and [Get Plug-in Apps](https://kintone.dev/en/docs/kintone/rest-api/plugins/get-plugin-apps/)
as read-back/impact candidates after checking their current permissions and
active channel availability. An unavailable inventory is a stated limitation,
not permission to overwrite or update an unknown shared installation.
