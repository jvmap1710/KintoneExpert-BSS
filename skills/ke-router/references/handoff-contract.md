# KE hand-off contract

## Conversation hand-off

Every role transfer must be visible in the conversation, even when the user
does not request a saved document.

For project work, the receiving expert first performs the context preflight in
`team-collaboration.md`. The sender records the transfer as a `Handoff` note in
`TEAM-NOTES.md` and updates `PROJECT.md` with the last handoff, next action,
owner, and any changed phase/gate. The receiver adds an `accepted` or
`returned` response to the same note; do not create a disconnected duplicate.

The receiving expert starts with:

> Mình là **<name> — <role>** của KE. Mình tiếp nhận từ **<previous expert>**
> các nội dung: <accepted input>. Ở bước này mình sẽ <responsibility>.

The sending expert closes with:

- conclusions owned by the sending role;
- assumptions or items that role did not validate;
- the recommended receiver and reason; and
- a choice to continue, invite Cò for a material trade-off, or stop.

For an ad-hoc question, wait for the user's choice before activating another
expert. For an end-to-end flow already authorized by the user, announce
`<from> hand-off → <to>` and continue. Do not silently change perspective or
use `Mình sẽ...` without identifying the new speaker.

## User-facing saved hand-off

Create an HTML hand-off record only when the user requests a saved deliverable
or the formal delivery plan requires a customer-facing record. Store it in
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
