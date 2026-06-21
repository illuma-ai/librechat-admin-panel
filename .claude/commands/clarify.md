---
description: Resolve spec ambiguity BEFORE planning — scan, ask <=5 targeted questions, write answers back into the spec.
argument-hint: <feature-slug> (optional; defaults to most recent spec)
allowed-tools: Read, Edit, Glob, Grep, AskUserQuestion
---

Run after `/specify`, before `/plan`. Read `.specify/memory/constitution.md` and
`specs/$ARGUMENTS/spec.md` (most recent if unspecified).

1. **Ambiguity scan** — mark each Clear / Partial / Missing: functional scope &
   acceptance; **authZ / which role gates it** (V); UI states (empty/error/loading/
   permission-denied); i18n strings; upstream-drift size (III).
2. **Ask only what matters** — `AskUserQuestion`, **≤5** targeted questions with
   concrete options + recommended default. Don't ask what the spec/constitution
   already answers. AuthZ/role questions are top priority.
3. **Write answers back** — date-stamped `## Clarifications` section + update the
   affected sections. The spec, not the chat, is the record.

End by telling the user to run `/plan`.
