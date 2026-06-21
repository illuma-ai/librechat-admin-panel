# Scores & Evaluations — what's real vs. deferred

## What LibreChat actually sends (real, today)
LibreChat emits **exactly one score type**, via a path separate from traces —
`LibreChat/packages/api/src/langfuse/feedback.ts` → `POST /api/public/scores`
(Basic `pk:sk`), triggered by a user's 👍/👎 on a message:

| field | value |
|---|---|
| `name` | `user-feedback` |
| `value` | `1` (thumbsUp) / `0` (thumbsDown) |
| `data_type` | `BOOLEAN` |
| `comment` | `<tag — text>` (optional) |
| `id` | `feedback-<traceId>` (re-submittable; latest-wins; DELETE = tombstone) |

That is the **entire** real score surface from LibreChat. It is sparse (only on
explicit feedback) and requires LibreChat's feedback UI to be enabled.

## What is NOT real (do not seed or fake)
The richer scores previously shown on the dashboard — `toxicity`, `helpfulness`,
`hallucination`, `relevance`, and the NUMERIC/CATEGORICAL variety — were **dev seed
data** (`seed-scores.mjs`, now **deleted**). LibreChat does **not** send these. They are
**evaluation** scores (LLM-as-judge / Langfuse evaluators) produced by an **eval
system that does not exist yet**.

**Principle:** if a score only exists once an eval system produces it, we do **not**
seed/mock it to populate screens. We **document** it (here) and build the **whole eval
system as one coherent Phase 3 unit** later.

## Status of the Scores screens
The Scores cards/pages are real and Langfuse-correct (the `#`/`Ⓑ`/`Ⓒ` data-type icons +
`0`/`1` columns will render real `user-feedback` BOOLEAN scores properly). They were
only ever **demoed on seed data**; with the seed removed they reflect **real data
only** — i.e. `user-feedback` (sparse) today, and the full eval-score variety once
**Phase 3 (evaluations)** is built. Until then, eval-driven score analytics stay in a
"comes with evaluations" state, not shown populated.

## Phase 3 (evaluations) — to build as a whole, later
- Eval runners (LLM-as-judge / rule-based), eval configs, and the score write-back to
  `/api/public/scores` (the collector already accepts the Langfuse score shape:
  `name`/`value`/`data_type`/`source`/`string_value`/`comment`/`trace_id`).
- `source` distinguishes `ANNOTATION` (human/user-feedback) vs `EVAL` vs `API`.
- Only then do the multi-name score dashboards light up with real data.
