# KE Kit 1.0.23-beta.2

Date: 2026-11-10

**Supervised beta only. This release is not production-ready.** Use only in an
authorized dev/test environment with synthetic data and an operator supervising
the work. Do not use it against production apps or production data.

## Improvements in this beta

- Business-analysis and documentation guidance now starts from business
  context, distinguishes process/state/data/form diagrams, and links business
  concepts to app/field/script structure with traceability proportional to the
  available evidence. Script behavior is described only when source or runtime
  evidence supports it; complete field mapping is not a blanket gate.
- The mainline LeBa requested-diagnostics guidance is included in this beta.
- Package generation now includes only the seven known project-template
  scaffold files. User-provided material under template input, output, private,
  analysis, or history folders is not included in the installer payload.

## Verification

Root independently ran the full package lifecycle on Windows / Node 24.18.0:
`npm --cache .npm-cache pack --dry-run` passed with TLS verification enabled.
The installer contains 91 payload files. Validation of 9 skills, 21 installed
flow checks, 23 installer-hardening checks (including isolated template-data
exclusion), 11 state checks, setup fixtures, 9 routing-contract cases, and both
runtime fixture suites passed. Both modified skills passed skill validation.

An independent synthetic instruction-use evaluation produced a business-first
outline, process steps, field/script examples, and explicit evidence gaps.
It retained unknown script behavior and source/configuration differences;
this was an outline-level evaluation, not a rendered document or live test.
No customer documents, credentials, or tenant records were published.
Hosted CI, live Kintone/browser acceptance, and customer UAT are not established
by these offline results.

## Readiness gates

This remains a supervised beta. Previously open release gates remain open unless
independently retested and recorded, including live tenant/browser evidence,
automated end-to-end execution, broader platform coverage, and dependency
remediation. Offline checks alone do not establish production readiness.
