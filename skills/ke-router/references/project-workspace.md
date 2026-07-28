# Customer project workspace

After the user clones the repository for a customer project, initialize one
isolated workspace before creating deliverables:

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-request `
  -DisplayName "ACME Purchase Request"
```

Use a lowercase, hyphenated slug containing only `a-z`, `0-9`, and `-`. The
script creates `projects/<project-slug>/` from `projects/_template/`, creates
`output/<project-slug>/`, and refuses to overwrite either directory.

Use this minimal structure:

| Directory | Owner / purpose |
| --- | --- |
| `projects/<project-slug>/input/` | Customer-provided sanitized source material |
| `projects/<project-slug>/private/` | Raw survey data, PII, attachments, and confidential working data |
| `output/<project-slug>/` | Generated standalone HTML deliverables only |

Never place credentials, tokens, passwords, downloaded attachments, personal
Kintone data, or unredacted production exports in generated HTML. Customer
project and output directories are Git-ignored by default. Reuse synthetic
examples from `examples/sample-data/`; never replace them with customer data.
