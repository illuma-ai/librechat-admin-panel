/**
 * Dev seed: insert representative feedback/eval scores into the ClickHouse `scores`
 * table so the Traces UI Scores column + filter can be exercised locally.
 *
 * Mirrors the Langfuse score shape (NUMERIC / CATEGORICAL / BOOLEAN, sources
 * API / EVAL / ANNOTATION) and attaches scores to existing traces of the active
 * tenant. Trace-level scores use observation_id = '' (they attach to the root node
 * and appear in the trace's Scores tab); the column aggregates all of a trace's
 * scores. Inserts directly over the ClickHouse HTTP interface — this is local dev
 * tooling, not the production ingestion path (that is the collector's
 * /api/public/scores endpoint).
 *
 * Usage: node scripts/seed-scores.mjs
 * Env (optional): CLICKHOUSE_URL (default http://localhost:8124),
 *   CH_USER/CH_PASSWORD/CH_DB (default trace/trace/trace).
 */

const CH_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8124';
const CH_USER = process.env.CH_USER ?? 'trace';
const CH_PASSWORD = process.env.CH_PASSWORD ?? 'trace';
const CH_DB = process.env.CH_DB ?? 'trace';

/** Score templates rotated across the seeded traces (Langfuse-faithful). */
const TEMPLATES = [
  { name: 'helpfulness', dataType: 'NUMERIC', source: 'EVAL', value: () => round(0.6 + rand() * 0.4), comment: 'Auto-eval: answer addressed the request.' },
  { name: 'hallucination', dataType: 'CATEGORICAL', source: 'EVAL', categories: ['none', 'minor', 'major'], comment: 'Auto-eval: factual grounding check.' },
  { name: 'user_feedback', dataType: 'BOOLEAN', source: 'ANNOTATION', value: () => (rand() > 0.3 ? 1 : 0), comment: null },
  { name: 'toxicity', dataType: 'NUMERIC', source: 'EVAL', value: () => round(rand() * 0.2), comment: 'Auto-eval: low is good.' },
  { name: 'relevance', dataType: 'CATEGORICAL', source: 'API', categories: ['low', 'medium', 'high'], comment: 'External rubric grade.' },
];

let seed = 1337;
function rand() {
  // deterministic LCG so re-runs produce stable data
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const round = (n) => Math.round(n * 100) / 100;

async function ch(query, body) {
  const url = `${CH_URL}/?user=${CH_USER}&password=${CH_PASSWORD}&database=${CH_DB}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${await res.text()}`);
  return res.text();
}

async function main() {
  const tsv = await ch(
    `SELECT tenant_id, id, environment FROM traces FINAL WHERE is_deleted = 0 ORDER BY timestamp DESC LIMIT 14 FORMAT TSV`,
  );
  const traces = tsv
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [tenantId, id, environment] = line.split('\t');
      return { tenantId, id, environment: environment || 'default' };
    });
  if (traces.length === 0) throw new Error('No traces found to attach scores to — seed traces first.');

  const nowMs = Date.now();
  const rows = [];
  traces.forEach((trace, i) => {
    // 1–3 distinct scores per trace, rotating through the templates.
    const count = 1 + (i % 3);
    for (let k = 0; k < count; k++) {
      const tpl = TEMPLATES[(i + k) % TEMPLATES.length];
      const isCategorical = tpl.dataType === 'CATEGORICAL';
      const stringValue = isCategorical ? tpl.categories[Math.floor(rand() * tpl.categories.length)] : '';
      const value = isCategorical ? 0 : tpl.value();
      rows.push({
        tenant_id: trace.tenantId,
        id: `seed_score_${trace.id.slice(0, 8)}_${tpl.name}`,
        trace_id: trace.id,
        observation_id: '',
        timestamp: fmt(nowMs - i * 60000),
        name: tpl.name,
        value,
        string_value: stringValue,
        data_type: tpl.dataType,
        source: tpl.source,
        comment: tpl.comment ?? '',
        environment: trace.environment,
        config_id: '',
        metadata: {},
        is_deleted: 0,
      });
    }
  });

  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  await ch(`INSERT INTO scores FORMAT JSONEachRow`, body);
  console.log(`Inserted ${rows.length} scores across ${traces.length} traces.`);
  const [{ c } = {}] = JSON.parse(
    await ch(`SELECT count() AS c FROM scores FINAL WHERE is_deleted = 0 FORMAT JSON`),
  ).data;
  console.log(`scores table now has ${c} live rows.`);
}

function fmt(ms) {
  // ClickHouse DateTime64(3): 'YYYY-MM-DD HH:MM:SS.mmm'
  return new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
