# KE project workspace

For every Demo/PoC or customer implementation, initialize one isolated
workspace before reading project inputs or creating deliverables. Derive a
safe lowercase slug from the supplied name when practical; ask only when the
name is ambiguous.

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-request `
  -DisplayName "ACME Purchase Request" -ProjectType customer `
  -Objective "Triển khai quy trình đề nghị mua hàng cho ACME"

./scripts/init-customer-project.ps1 -ProjectSlug purchase-demo `
  -DisplayName "Purchase Request Demo" -ProjectType demo `
  -Objective "Dựng PoC quy trình đề nghị mua hàng"
```

Use a lowercase, hyphenated slug containing only `a-z`, `0-9`, and `-`. The
script creates `projects/<project-slug>/` from `projects/_template/` and
refuses to overwrite an existing workspace. The agent should run it after the
user has selected Demo/PoC or customer implementation and supplied the minimum
project identity. Always pass the objective inferred from the conversation;
do not leave it as `Chưa xác định` when the user already stated the desired
outcome.

Use this minimal structure:

| Directory | Owner / purpose |
| --- | --- |
| `projects/<project-slug>/input/` | Customer-provided sanitized source material |
| `projects/<project-slug>/private/` | Raw survey data, PII, attachments, and confidential working data |
| `projects/<project-slug>/output/` | Generated standalone HTML deliverables only |

Never place credentials, tokens, passwords, downloaded attachments, personal
Kintone data, or unredacted production exports in generated HTML. Customer
project directories are Git-ignored by default. Use only sanitized customer
inputs or synthetic data created specifically inside the current project.
