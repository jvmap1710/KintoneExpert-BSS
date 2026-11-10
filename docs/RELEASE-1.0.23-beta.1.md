# KE Kit 1.0.23-beta.1

Date: 2026-11-10

**Supervised beta only. This release is not production-ready.** Use only in an
authorized dev/test environment with synthetic data and an operator supervising
the work. Do not use it against production apps or production data.

## Improvements in this beta

- More flexible onboarding and routing, including direct expert requests and
  explicit project selection for state changes.
- Stronger installer upgrade, migration, and recovery checks, with safeguards
  for preserving local project state and user-managed files.
- Clearer runtime and tenant-access boundaries, including guarded probes and
  project/role-scoped browser profiles.
- Expanded offline regression coverage for installer, setup, project state, and
  runtime helpers.

## Verification on 2026-11-10

Root independently ran `npm --cache .npm-cache pack --dry-run` with TLS
verification enabled for the process: exit 0 on Windows / Node 24.18.0.
The full lifecycle passed: 90-file installer build, 9-skill validation,
21 installed-flow checks, 22 installer-hardening checks, 11 state-hardening
checks, setup fixtures, 9 routing-contract cases, and both runtime suites.
These are offline/fixture checks, not tenant or browser acceptance.
The package contains only README, the bundled installer, and package metadata.
The 2026-11-09 closing report remains a historical pre-release snapshot.

## Readiness gates

- No hosted CI result or live Kintone/Playwright runtime test is recorded for
  this beta. The live E2E runner remains fail-closed: it validates plans but
  does not execute them.
- Model-based behavior E2E, live-eval runner hardening, exporter language and
  canonical-path hardening, and Office output acceptance remain open.
- A fresh dependency audit on 2026-11-10 found three moderate advisories in the
  transitive chain `qs` → `rest-api-client` → `mcp-server`, and zero high or
  critical advisories. Dependency remediation remains open; no downgrade or
  forced fix was applied.
- Broader platform/Node-version installation coverage and a least-privilege
  supervised tenant test remain outstanding. Do not infer production readiness
  from offline tests or package validation.
- Prerelease suffix comparison is lexical, not fully SemVer identifier-aware.
  This beta upgrades safely from `1.0.22`; ordering later labels such as
  `beta.10` versus `beta.2` needs correction before such a release.
