# Language preferences

Read `.codex/ke-preferences.toml` when it exists.

Precedence:

1. the user's explicit instruction in the current conversation;
2. the project-local preference file;
3. English.

Use `chat_language` for conversation, role introductions, confirmations,
handoffs, and summaries. Preserve code, field codes, App IDs, commands, URLs,
product names, and exact error messages unless a translated explanation is
also useful.

Use `document_languages` for newly generated deliverables. When it contains
more than one language, create one complete standalone file per language, not
one mixed-language file, unless the user explicitly requests a bilingual
layout. Keep the same document ID, scope, facts, evidence references, and
version across language copies; add a clear language suffix such as `-en`,
`-vi`, or another unambiguous locale/name suffix.

Do not translate customer-approved terminology silently. Keep a term glossary
or show the source term in parentheses when ambiguity matters.

The preference file is local and Git-ignored. Never treat it as a customer
deliverable or copy its filesystem path into output.
