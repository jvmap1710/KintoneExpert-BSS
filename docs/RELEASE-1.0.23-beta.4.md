# KE Kit 1.0.23-beta.4

Date: 2026-11-16

Supervised beta for authorized dev/test use only; not production-ready.

## Changes

- Router and direct LeBa entry share explicit project-selection/creation intake.
  Missing MCP no longer suppresses the workspace question or offline review.
- LeBa distinguishes preflight, unreconciled draft, and evidence-backed build
  review. Design-to-tenant reconciliation records Reuse/Modify/Create/open items.
- Whole-build capability inventory includes Space, App settings, dependencies,
  customization, deployment, and Playwright verification. Consolidated config
  changes require approval; loaded tools are checked after host reload.
- Configuration approval remains separate from tenant writes, deploy, deletion,
  and synthetic-data approval. Temporary write permissions must be restored.
- Five new routing fixtures cover missing/ambiguous projects, explicit creation,
  existing-project offline review, and advice. Live routing evaluation now checks
  optional clarification expectations. Corpus validation is not behavior proof.

## Verification and limits

The complete `npm pack --dry-run` lifecycle passed: build, nine-skill validation,
21 flow checks, 23 installer-hardening checks, onboarding fixtures, 11 project
state checks, 14 routing corpus cases, and both synthetic runtime suites.
Distribution contains only README, package metadata, and the bundled installer.
Prior targeted validation/build checks passed; five intake cases were independently
reviewed as instruction simulations, not executed tenant/browser tests.
No live tenant/browser acceptance or new dependency audit is claimed. Hosted CI
was previously blocked by account billing; this release does not assume it fixed.
Customer inputs and credentials must remain outside the distribution.

## Install or upgrade

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.4 install
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.4 upgrade --dry-run
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.4 upgrade
```
