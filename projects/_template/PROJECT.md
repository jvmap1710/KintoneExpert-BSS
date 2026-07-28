# {{DISPLAY_NAME}}

| Item | Value |
| --- | --- |
| Project slug | `{{PROJECT_SLUG}}` |
| Customer-safe name | {{DISPLAY_NAME}} |
| Created | {{CREATED_DATE}} |
| Current phase | Frame |
| Current owner | Unassigned |
| Environment | Test |

## Rules

- Put customer-provided, sanitized source material in `input/`.
- Put raw survey data, personal data, attachments, credentials, and unredacted
  customer exports in `private/`.
- Save generated deliverables only as HTML under
  `../../output/{{PROJECT_SLUG}}/`.
- Do not commit credentials, tokens, passwords, attachments, personal data, or
  unredacted production exports.
- The customer workspace and generated output are Git-ignored by default.
