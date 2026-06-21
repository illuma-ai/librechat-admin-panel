---
description: Turn a feature request into a structured spec (what/why, no how).
argument-hint: <feature description>
allowed-tools: Read, Write, Edit, Glob, Grep
---

Read `.specify/memory/constitution.md` (binding) and `CLAUDE.md`/`AGENTS.md`.
Convert the request into a spec using `.specify/templates/spec-template.md`.

Feature request: $ARGUMENTS

1. Derive a kebab-case `<feature-slug>`; create `specs/<feature-slug>/spec.md`.
2. Fill every section — what & why only, testable Given/When/Then. Always complete
   the **Security / authZ impact** and **UI / i18n / upstream-drift** sections
   (N/A with justification if none).
3. List which constitution principles (I–VIII) this touches.
4. Ambiguous? add to a questions list; ask the minimum — don't invent.

No HOW, no code. End by telling the user to run `/clarify` (if ambiguous) or `/plan`.
