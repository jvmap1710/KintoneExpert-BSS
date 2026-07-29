# Record query diagnostics

Use this sequence whenever a record read returns no rows or appears
inconsistent with the user's expectation.

1. Confirm the App ID and retrieve the field schema. Use field codes, not
   display labels, in queries.
2. Make a small unfiltered read against the same App and authentication
   context. Request only non-sensitive fields needed to understand the sample.
3. If the unfiltered read returns records, inspect actual stored values and
   field types before rebuilding the filter. Check spelling, case, whitespace,
   user codes versus display names, lookup values, status values, and query
   syntax.
4. Re-run the narrow query and report its match count separately from the
   App's readable sample or total count.

Interpret results precisely:

- A successful filtered response with zero rows means only **no visible record
  matched that filter**. It does not prove missing App or record permissions.
- A successful unfiltered response with records proves those returned records
  are readable in the current authentication context.
- A successful unfiltered response with zero rows is inconclusive: the App may
  be empty or record-level permissions may hide all rows. State both
  possibilities and seek independent evidence.
- Claim an authentication or permission problem only when the tool/API returns
  an explicit authentication/authorization error, or when a controlled
  comparison provides direct permission evidence. Preserve the exact error
  code and message.
- Treat missing tools, transport failures, invalid parameters, and query syntax
  errors as separate failure classes; do not relabel them as permissions.

Before any update, resolve the exact record IDs and revisions from a successful
read. If troubleshooting changes the scope from a filtered subset to all
readable records, summarize the new count and identifiers and obtain explicit
confirmation before writing. Read the affected records back after the update.
