# Process Management through REST API

Kintone officially supports reading and updating an App's Process Management
settings through REST. The current Kintone MCP server may not expose this
operation. Treat that as an MCP capability gap, not a reason to configure the
workflow manually.

## Channel and authorization

Prefer an active MCP tool when it exposes Process Management. Otherwise,
explain the gap once and offer the official REST API (recommended for an
automated, repeatable build) or the Kintone administration UI. After the user
approves REST for the named App and Process Management operation, proceed
without asking them to approve the channel again. Deployment remains a
separate approval gate.

The Process Management APIs support password, API token, session, and OAuth
authentication. Reading or updating pre-live settings requires App Management
permission. Unlike Update Customization, this operation can use API token
authentication.

## Safe REST flow

1. Confirm the target App ID, environment, intended statuses, assignees,
   actions, and branch conditions.
2. Read the current pre-live settings with
   `GET /k/v1/preview/app/status.json`.
3. Validate that referenced field codes and assignee entities exist. Use the
   exact field code for a `FIELD_ENTITY`; never guess from a field label.
4. Construct the complete intended `states` and `actions` sets. Preserve
   existing items outside the approved scope.
5. Send `PUT /k/v1/preview/app/status.json` with `enable`, `states`, `actions`,
   and the latest read revision. Do not use `-1` in normal operation because
   it disables optimistic revision checking.
6. Read the pre-live settings back and compare status names/order, assignee
   type/entities, action transitions, branch conditions, enablement, and
   revision with the approved design.
7. Summarize the pending change and obtain explicit deployment approval.
8. Deploy App settings and poll until `SUCCESS`.
9. Test the live workflow with synthetic records: available actions,
   transitions, branch conditions, and assignee behavior. Pre-live settings
   are not a runnable preview and cannot be runtime-tested before deployment.

## Shared staging command

Save the complete desired `enable`, `states`, and `actions` settings as JSON
under `projects/<project-slug>/private/`. Do not include `app` or `revision`;
the command binds those values to the inspected App and latest preview.

After the user approves REST staging for the named App, run:

```powershell
npm --prefix platform/ke-kintone-mcp run process:stage -- --app <APP_ID> --config <CONFIG_PATH>
```

The command validates indexes, assignee modes/entities, action endpoints, and
field-code-shaped inputs; GETs the baseline with `lang=default`; PUTs with the
latest revision; GETs again; and deep-compares the complete normalized
workflow. It reports a verified pre-live revision and never deploys it.

## Schema and loss-prevention rules

- `states` is keyed by status name. When adding or updating statuses, include
  every existing status that must remain; omitted existing statuses are
  deleted.
- The first status cannot be added as a new status. Rename/update the existing
  first status when the initial status name must change.
- For an App that never enabled Process Management, do not guess a localized
  initial-state object key. Confirm the tenant's default initial state before
  the first PUT; keep that existing name as the object key and put the desired
  name in the state's `name` property.
- Every included status needs a display `index`.
- Assignee type is `ONE`, `ALL`, or `ANY`. The first status is always `ONE`.
- Supported assignee entity types include `USER`, `GROUP`, `ORGANIZATION`,
  `FIELD_ENTITY`, `CREATOR`, and `CUSTOM_FIELD`. Departments cannot be used in
  guest-space Apps.
- An action needs `name`, `from`, and `to`; `filterCond` is an optional Kintone
  query. The Status field itself cannot be used in `filterCond`.
- Treat `states` and `actions` as coherent workflow definitions. Never omit an
  existing state or action as an accidental side effect of a partial payload.
- `states` and `actions` are complete replacement sets for this operation.
- Renaming/deleting a status or removing an action is a material change. Show
  the exact before/after diff and obtain explicit confirmation before the PUT,
  in addition to the separate deployment confirmation.

## Official references

- Get Process Management Settings:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-process-management-settings/
- Update Process Management Settings:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/update-process-management-settings/
- Deploy App Settings:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/deploy-app-settings/
- Get App Deploy Status:
  https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-app-deploy-status/
- Authentication:
  https://kintone.dev/en/docs/common/authentication/
