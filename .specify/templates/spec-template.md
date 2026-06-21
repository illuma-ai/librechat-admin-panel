# Spec: <FEATURE NAME>

> Produced by `/specify`. WHAT/WHY only — no HOW.

## Status
- **Feature slug:** <kebab-id> · **State:** draft | approved
- **Constitution touch:** <principles I–VIII affected>

## Problem / motivation
<What admin/management UX or capability does this serve? Why now?>

## Goals / Non-goals
- Goal: <measurable> · Non-goal: <out of scope>

## Acceptance criteria (testable Given/When/Then)
1. GIVEN … WHEN … THEN …

## Security / authZ impact (Principle V)
- Privileged action? Which role/capability gates it (server-side)? Inputs to
  validate. State **N/A** with justification if read-only/no privileged surface.

## UI / i18n / upstream-drift impact (Principles III, VII)
- New route/component? New `locales/` strings? How surgical is the delta vs upstream?

## Edge cases & failure modes
- empty/error/loading states; permission-denied; large lists (pagination).

## Review checklist (before `/plan`)
- [ ] No implementation detail leaked · [ ] Every criterion testable
- [ ] Security/authZ + UI/i18n/drift impact stated
