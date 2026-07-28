# KE — Kintone Expert

Project-scoped setup for controlling Kintone from Codex through Cybozu's
official local MCP server.

## Quick start

Prerequisite: Node.js 22 or newer.

Open a terminal in the customer project and run:

```powershell
npx kintone-expert-bss install
```

Follow the installer prompt. It adds KE Kit to the current project, preserves
existing project instructions/configuration, installs the Kintone MCP runtime,
and creates a local `.env` without overwriting an existing one.

For non-interactive installation:

```powershell
npx kintone-expert-bss install --directory C:\path\to\customer-project --yes
```

Use `--skip-deps` when dependencies are managed separately. The installer
stops on conflicting KE-managed files by default; review conflicts before
using `--force`.

After installation, add the customer-specific Kintone credentials to
`platform/ke-kintone-mcp/.env`, then test the configuration:

```powershell
npm --prefix platform/ke-kintone-mcp run check
npm --prefix platform/ke-kintone-mcp run test:connection
```

Open this repository in Codex and trust the project when prompted. Start the
conversation with `hello`; KE Router will present the available entry flows.
For a full-cycle customer project, create its isolated workspace first:

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-request `
  -DisplayName "ACME Purchase Request"
```

Place sanitized source material in `projects/<project-slug>/input/`. Keep raw
or confidential material in `projects/<project-slug>/private/`. Generated
standalone HTML is written to `output/<project-slug>/`. These customer folders
are excluded from Git.

## Prerequisites

- Node.js 22 or newer
- Codex CLI/app
- A Kintone account with permissions appropriate for the intended operations

## Install from source

Cloning is intended for KE Kit maintainers and contributors:

1. Clone the repository:

   ```powershell
   git clone https://github.com/jvmap1710/KintoneExpert-BSS.git
   Set-Location KintoneExpert-BSS
   ```

2. Install the development runtime, validate the kit, and create the local
   credential file:

   ```powershell
   npm install
   npm run dev:install
   npm run validate
   npm run setup
   ```

3. Edit `.env` and set `KINTONE_BASE_URL`, then choose exactly one:

   - `KINTONE_USERNAME` and `KINTONE_PASSWORD` for app creation/settings/deploy
   - `KINTONE_API_TOKEN` for operations allowed by the token

4. Validate the local configuration:

   ```powershell
   npm --prefix platform/ke-kintone-mcp run check
   npm --prefix platform/ke-kintone-mcp run test:connection
   ```

5. Restart Codex, open this folder, and trust the project when prompted.

6. Confirm that the server is visible:

   ```powershell
   codex mcp list
   ```

## First safe prompt

> Use the Kintone MCP tools in read-only mode. List the apps I can access and
> show their app IDs. Do not create, update, deploy, or delete anything.

Then test app creation:

> Create a test-environment app named "Codex MCP Sandbox" with fields `Title`
> (single-line text, required) and `Description` (multi-line text). Read the
> settings back and show me the pending changes. Do not deploy until I confirm.

## Start a customer project

Clone this repository for the customer engagement, then initialize an isolated
project workspace:

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-request `
  -DisplayName "ACME Purchase Request"
```

The initializer creates:

- `projects/<project-slug>/input/` for sanitized customer source material.
- `projects/<project-slug>/private/` for raw or confidential working data.
- `output/<project-slug>/` for generated standalone HTML only.

It refuses to overwrite an existing project or output directory. Customer
workspaces and generated HTML are Git-ignored by default. Use the fictional
files under `examples/sample-data/` when practising the flow.

## Authentication notes

Username/password authentication takes precedence if it is configured together
with an API token. Avoid configuring both. API tokens can be comma-separated
(up to nine), but their app scope and permissions may prevent app-management
operations.

Guest-space apps are not supported by the official MCP server. Record
add/update tools also do not accept attachment fields. Downloaded files are
written to `attachments/`, which is excluded from Git.

## Useful commands

```powershell
npm run validate
npm run setup
npm --prefix platform/ke-kintone-mcp run check
npm --prefix platform/ke-kintone-mcp run test:connection
npm --prefix platform/ke-kintone-mcp run mcp:kintone
codex mcp list
```

The `mcp:kintone` command is a stdio server and normally appears to wait silently;
Codex starts and communicates with it automatically.

## Project layout

```
skills/                 # KE Router, PM, BA, SA, Engineer, Tester, expert panel
platform/ke-kintone-mcp/# Official Kintone MCP runtime wrapper
projects/_template/     # Minimal customer input/private workspace
output/                 # Generated customer HTML; ignored except .gitkeep
examples/sample-data/   # Synthetic survey and transaction examples
scripts/                # Project initializer and Markdown-to-HTML converter
.codex/config.toml      # Enables skills and starts the Kintone MCP runtime
KE-HELP.md              # User guide, team roles, flow, and prompt examples
```

## Expert team workflow

See [KE-HELP.md](KE-HELP.md) for the short user guide and example prompts.

KE Router is the entry point for greetings, help, broad requests, and new
projects. It introduces the team and routes the request before delivery starts.

After trusting and reopening the project, Codex routes natural-language
requests to the relevant local skill. You can also call a person directly.

| Expert | Role | Typical request |
| --- | --- | --- |
| Tí | PM | scope, roadmap, priority, delivery plan |
| Tèo | BA | collect requirements, sample forms, BRD, To-Be process |
| Sơn | SA | app/data architecture, integration, security, lookup design |
| Bình | Kintone Engineer | build, customize, configure, deploy through MCP |
| Mít | Tester | test cases, UAT, acceptance and defect triage |
| Cò | Expert panel | multi-role discussion, options, risks and decision |

Typical flow: **Tí → Tèo → Sơn → Bình → Mít → Tí**. Cò may be invited at any
point when a decision needs several perspectives. A workflow configuration is
advised and documented by the team; implementing it in Kintone still follows
the approval and deployment rules in `AGENTS.md`.

## macOS/Linux

Change `command = "npm.cmd"` to `command = "npm"` in
`.codex/config.toml`.

## References

- https://kintone.dev/en/ai/kintone-mcp-server-intro/
- https://github.com/kintone/mcp-server
- https://developers.openai.com/codex/mcp/
