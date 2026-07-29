# LeBa-to-Mít quick verification

Quick verification is the mandatory change-level QA gate after LeBa completes
an implementation, configuration, customization, deployment, or defect-fix
task. It happens before KE gives the task's final completion response.

Quick verification is not a smoke test, UAT, regression pack, or release
recommendation.

## Handoff and execution

LeBa hands Mít:

- the task objective and acceptance condition;
- App ID/environment and current staged/deployed revision;
- changed fields, settings, files, workflow, or code;
- the execution channel and evidence already collected;
- known limitations and anything not deployed.

Mít then:

1. Select 1–3 checks targeted to the changed behavior.
2. Prefer read-back, syntax/unit checks, and Playwright evidence appropriate to
   the current state. A staged but undeployed change can receive configuration
   verification only; report runtime as not yet verified.
3. Do not create records or mutate workflow merely for quick verification.
   Use a record only when the task's existing authorized synthetic-data scope
   already permits it. Otherwise mark that check `BLOCKED` or defer it to the
   approved smoke test.
4. Return `PASS`, `FAIL`, or `BLOCKED` with expected result, actual result, and
   a concise evidence reference.
5. On `FAIL`, hand the defect back to LeBa. LeBa fixes it and returns the same
   acceptance condition to Mít for re-verification.

No standalone HTML report is required for quick verification unless the user
asks for one. Never call a quick-verification result `smoke PASS`,
`demo-ready`, `release-ready`, or full feature acceptance.

## Final response gate

LeBa may give a final task-completion response only after Mít reports `PASS`,
or after accurately reporting a `BLOCKED` result and its missing evidence.
The response must include:

- what LeBa changed;
- Mít's quick-verification status and evidence level;
- staged/deployed/runtime state;
- remaining feature work and deferred checks.

## Full smoke-test gate

Do not start the 5–10 case/record smoke test automatically after an individual
task. Start it only when:

1. LeBa confirms every feature in the agreed scope is complete;
2. all required deployments for that scope have reached `SUCCESS`;
3. the user explicitly says `OK` or otherwise approves the full smoke test;
4. the target is a named Demo/PoC or test App with an approved synthetic-data
   boundary.

Then follow `smoke-test-evidence.md`, create the mandatory HTML report, and
make the evidence-based demo/release recommendation.
