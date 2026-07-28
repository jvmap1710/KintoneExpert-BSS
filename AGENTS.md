# Kintone automation rules

This repository connects Codex to Kintone through the official local MCP
server. Use the `kintone` MCP tools for Kintone operations.

## Workflow

1. Inspect the target app and its current settings before proposing changes.
2. For a new app, create it in the Kintone test environment first.
3. Apply field, layout, general-setting, and process-management changes in
   small, reviewable steps.
4. Read the settings back and verify them before deployment.
5. Ask for explicit confirmation before deleting fields, records, or spaces.
6. Before deploying app settings, summarize the app ID and pending changes.
7. After deployment, poll the deploy status until it is `SUCCESS` or report
   the returned failure.

Never place credentials, API tokens, passwords, downloaded attachments, or
personal Kintone data in tracked files or terminal output.

## Expert-team routing

At the start of a conversation, when the user says hi, hello, xin chào, xin
chao, asks for help, or asks what KE can do, invoke `ke-router`. Introduce KE,
its expert team, the standard flow, and the read-only MCP / controlled-write
boundary.
For a greeting-only message, show the numbered entry choices defined by
`skills/ke-router/references/entry-routing.md`. If the greeting already
contains a clear intent, skip the menu and route it directly.

Use the project skills when their role matches the request: Tí/Ti (PM),
Tèo/Teo (BA), Sơn/Son (SA), Bình/Binh (Kintone Engineer), Mít/Mit (Tester),
and Cò/Co (cross-role expert panel). Tí coordinates an end-to-end request and
keeps decisions, scope, and hand-offs clear. Use Cò when the user explicitly
requests a multi-role discussion or needs options and trade-offs at any project
stage.
Use `ke-document-writer` when the user requests a saved or exported project
deliverable. Generate standalone HTML only under `output/<project-slug>/` and
never overwrite an existing file without explicit confirmation.

All experts may use the Kintone MCP in read-only mode to inspect apps,
fields, layouts, process settings, and data relevant to their analysis. The
Engineer owns implementation changes by default. Any write, deployment, or
destructive action still follows the approval rules above.
