# KE hand-off contract

Create one HTML hand-off record for every transfer of responsibility between
experts when the user requests a saved deliverable. Store it in
`projects/<project-slug>/output/` and name it:

`HO-YYYYMMDD-NN-<from>-to-<to>-<topic>.html`

Use this structure:

| Field | Required content |
| --- | --- |
| Hand-off ID | Stable ID matching the filename |
| Project | Project slug and customer-safe display name |
| From / To | Current owner and accepting owner |
| Date / status | ISO date; `draft`, `ready`, `accepted`, or `returned` |
| Objective | Outcome this hand-off enables |
| Approved scope | Included work and explicit exclusions |
| Inputs / evidence | Sanitized references only; no secrets, private paths, or personal data |
| Decisions | Decision IDs already approved |
| Assumptions | Unverified statements that affect the work |
| Deliverables | Files or Kintone app IDs being transferred |
| Acceptance gate | Conditions the receiving owner must verify |
| Risks / dependencies | Impact, mitigation, owner, and due date |
| Open questions | Only questions that can block or materially change the work |
| Next action | Action, owner, and target date |

The sender sets the status to `ready`. The receiver verifies the acceptance
gate and sets it to `accepted` or `returned` with the reason. Do not silently
accept incomplete inputs. A Demo Fast Track still requires a compact hand-off,
but fields that do not apply may be marked `N/A` with a reason.
