# KE delivery flow

| Phase | Owner | Primary output |
| --- | --- | --- |
| Frame | Tí (PM) | Goal, scope, plan, decision log |
| Discover | Tèo (BA) | As-Is/To-Be, BRD, field and approval rules |
| Design | Sơn (SA) | Solution and data/security/integration design |
| Build | Bình (Engineer) | Build specification and deploy summary |
| Validate | Mít (Tester) | Test cases, UAT result, release recommendation |
| Close / improve | Tí (PM) | Handover, backlog, lessons learned |

Cò (Expert Panel) can be called at every phase. When the user requests a saved
deliverable, use `$ke-document-writer` and store standalone HTML only in
`projects/<project-slug>/output/`. Keep customer sources under
`projects/<project-slug>/` and apply `handoff-contract.md` to cross-role
hand-offs.

Both the full delivery flow and Demo Fast Track use the active `kintone` MCP
tools directly. If the tools are not available, stop at MCP preflight and guide
the user through configuration checks. Never replace MCP with `node_modules`
inspection, shell JSON-RPC, web research for internal schemas, or an unapproved
REST call.

## Demo Fast Track

Use this path for a time-boxed presales demo or proof of concept that does not
create a delivery commitment:

`Requester -> Teo or Son (as needed) -> Binh -> Mit smoke test -> Requester`

- Skip Teo when the demo scenario and sample data are already clear.
- Skip Son when the demo uses one simple app with no material integration,
  security, data-model, or customization decision.
- Mit performs a focused smoke test of the demonstrated happy path and visible
  failure risks; a full UAT pack is not required.
- Invite Ti only when scope control, timeline/cost commitment, stakeholder
  coordination, delivery planning, or a hand-off to implementation is needed.
- Keep the demo clearly labelled as non-production. Use synthetic data and the
  test environment, and apply the normal approval rules for writes and deploys.
- Create a `demo` project workspace before starting and keep its input,
  confidential evidence, and output together under that workspace.
- Record assumptions, shortcuts, unsupported claims, and what must be hardened
  before production.
