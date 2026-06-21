# Evaluations (Phase 3) — plan, integration points, and 1:1 Langfuse mapping

> Build the eval system as **one coherent unit**, ported 1:1 from Langfuse (MIT), only
> when we start Phase 3. Until then we **do not seed or fake** eval scores — the Scores
> dashboards render only real data (today: `user-feedback`; see `scores-and-evals.md`).

## Why evals are deferred (and why the screens still belong)
Eval scores (`toxicity`, `hallucination`, `relevance`, `helpfulness`, …) exist **only
once an evaluator runs an LLM-as-judge** and writes a score with `source = EVAL`.
LibreChat does **not** produce these — it only sends `user-feedback` (ANNOTATION).
So the multi-name Scores analytics need the eval system first. The Scores schema +
screens are already Langfuse-parity, so they light up automatically once evals write
real `source=EVAL` scores into the same `scores` table.

## Langfuse eval architecture (what we port)
Source: `C:\Projects\Eval\langfuse` (`packages/shared/prisma/schema.prisma`,
`worker/src/features/evaluation/`, `web/src/features/evals/`).

**Data model (Postgres):**
- `EvalTemplate` (`eval_templates`, schema ~L987) — the **judge definition**: `name` +
  immutable `version`, `prompt` (with `{{var}}` placeholders), `type`
  (`LLM_AS_JUDGE`|`CODE`), `model`/`provider`/`modelParams`, `vars[]`,
  `outputDefinition` (→ score dataType + categories). Nullable `projectId` = managed
  templates.
- `JobConfiguration` (`job_configurations`, ~L1046) — the **evaluator instance**:
  `evalTemplateId`, `scoreName`, `filter` (which traces match), `targetObject`
  (`TRACE`|`DATASET`), `variableMapping` (template var → trace/observation/dataset
  column), `sampling` (0..1), `delay` (ms), `timeScope` (`NEW` online / `EXISTING`
  backfill), `status`.
- `JobExecution` (`job_executions`, ~L1083) — a **single run**: input trace/obs/dataset
  id, `status`, `jobOutputScoreId`, `executionTraceId` (the judge call is itself traced
  with a `langfuse-…` environment to avoid eval-of-eval loops).
- `LlmApiKeys` (`llm_api_keys`, ~L294) — encrypted judge-LLM creds; `DefaultLlmModel`
  (~L1121) = per-project default judge.
- `ScoreConfig` (`score_configs`, ~L545) — score schema for annotation/categorical.

**Flow (online trace eval):** trace ingested → `TraceUpsert` queue →
`createEvalJobs` (`evalService.ts`) matches `ACTIVE` configs by `filter` + `sampling` →
creates `JobExecution (PENDING)` + enqueues `EvaluationExecution` with `delay` →
`evaluate`/`runLLMAsJudgeEvaluation` resolves `variableMapping`, compiles the prompt,
calls the judge via `fetchLLMCompletion` (structured output per `outputDefinition`),
normalizes to `{name,value,dataType,comment}` → `evalCompletion.ts`/`evalScoreEvent.ts`
writes a `score-create` event with **`source: EVAL`** through the **async ingestion
path** (S3 + IngestionQueue → ClickHouse). `source` values:
`API` (SDK) / `EVAL` (evaluator) / `ANNOTATION` (human/user-feedback).
Dataset/experiment evals = same models with `targetObject=DATASET` via the
`DatasetRunItemUpsert` queue.

## What's NET-NEW for our stack (and what we already have)
**Already have:** the `scores` ClickHouse table + the collector's `/api/public/scores`
endpoint (Langfuse score shape: `name`/`value`/`data_type`/`source`/`string_value`/
`comment`/`trace_id`) — the **score sink**; the admin Scores screens (read-only,
Langfuse-parity). So a produced eval score needs no new sink.

**Net-new (port 1:1), by where we touch:**
| Piece | Where we build it | Langfuse counterpart to port |
|---|---|---|
| (a) Eval template + config + execution storage | **collector** (`illuma-ai/traces`) Postgres — 3 tables | `EvalTemplate`/`JobConfiguration`/`JobExecution` (schema.prisma) |
| (b) Eval **worker** (match trace → sample → run judge → write `source=EVAL` score) | **collector** worker (BullMQ; we already run Redis/BullMQ) | `worker/src/features/evaluation/evalService.ts` (`createEvalJobs`, `evaluate`, `runLLMAsJudgeEvaluation`, `extractVariablesFromTracingData`) + `evalScoreEvent.ts` (exact score shape) |
| (c) Judge-LLM key storage + call | **collector** Postgres (`llm_api_keys`, encrypted) + an LLM client | `LlmApiKeys`/`DefaultLlmModel` + `fetchLLMCompletion` (structured output) |
| (d) Admin UI: template editor, evaluator form (filter+mapping+sampling+delay+scoreName), executions/results table | **admin panel** (this repo) | `web/src/features/evals/` (`evaluator-form.tsx`, `eval-templates-table.tsx`, `variable-mapping-card.tsx`, `eval-log.tsx`) + tRPC `features/evals/server/router.ts` (`createTemplate`, `createJob`, `updateEvalJob`, `getLogs`) — port to our server-fn pattern |

**One simplification vs Langfuse:** their worker detours score writes through S3 + a
dedicated IngestionQueue; we can write the `source=EVAL` score **directly via our
internal score-write path** (or POST `/api/public/scores` internally). Note Langfuse
restricts the *public* endpoint to `API`/`ANNOTATION` — `EVAL` is an internal-writer
source — so our eval worker writes `EVAL` via the internal path, not the public API.

## Phasing / sequencing (do NOT start until Phase 3)
1. **Prereq (now / in progress):** collector on Langfuse-parity schema (`project_id`,
   real provisioning) + the chart-library/query-engine vendor in admin. Evals build
   cleanly on top because they reuse the same project + score schema.
2. **Phase 3.1 — storage + worker:** port the 3 eval tables + `llm_api_keys`; build the
   match→judge→write worker; reuse our score sink. Write `source=EVAL`.
3. **Phase 3.2 — admin UI:** template editor + evaluator config + executions/results;
   the existing Scores dashboards then show real multi-name eval scores automatically.
4. **Phase 3.3 (optional):** dataset/experiment evals (`targetObject=DATASET`),
   CODE evals, observation-level evals.

## Dependencies to line up for Phase 3
BullMQ/Redis (have it), encrypted LLM-key storage (new), an LLM-as-judge client with
structured output (new), and (only for CODE evals) a sandboxed code runner. Heavy
Langfuse extras we can skip initially: S3 score detour, AWS Lambda code-eval dispatch.

## The single most important file to port
`worker/src/features/evaluation/evalService.ts` (match → variable extraction → judge →
normalize) + `evalScoreEvent.ts` (the exact `source=EVAL` score payload).
