# KE project workspace

For every Demo/PoC or customer implementation, initialize one isolated
workspace before reading project inputs or creating deliverables. Derive a
safe lowercase slug from the supplied name when practical; ask only when the
name is ambiguous.

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-request `
  -DisplayName "ACME Purchase Request" -ProjectType customer

./scripts/init-customer-project.ps1 -ProjectSlug purchase-demo `
  -DisplayName "Purchase Request Demo" -ProjectType demo
```

Use a lowercase, hyphenated slug containing only `a-z`, `0-9`, and `-`. The
script creates `projects/<project-slug>/` from `projects/_template/` and
refuses to overwrite an existing workspace. The agent should run it after the
user has selected Demo/PoC or customer implementation and supplied the minimum
project identity.

Use this minimal structure:

| Directory | Owner / purpose |
| --- | --- |
| `projects/<project-slug>/input/` | Customer-provided sanitized source material |
| `projects/<project-slug>/private/` | Raw survey data, PII, attachments, and confidential working data |
| `projects/<project-slug>/output/` | Generated standalone HTML deliverables only |

Never place credentials, tokens, passwords, downloaded attachments, personal
Kintone data, or unredacted production exports in generated HTML. Customer
project directories are Git-ignored by default. Reuse synthetic examples from
`examples/sample-data/`; never replace them with customer data.
