/**
 * Dashboard metric accuracy harness. Runs the dashboard's aggregate formulas against
 * ClickHouse and asserts cross-aggregate invariants that must hold if every widget's
 * calculation is correct — e.g. the sum of the time-series buckets equals the KPI
 * totals, latency percentiles are monotonic, and the model/user breakdowns reconcile
 * to the totals. Independent of dataset size, so it stays valid as data changes.
 *
 * Usage: node scripts/verify-metrics.mjs [tenantId] [range]
 *   range ∈ 24h | 7d | 30d | all (default 7d)
 * Env: CLICKHOUSE_URL (default http://localhost:8124), CH_USER/CH_PASSWORD/CH_DB.
 */

const CH_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8124';
const CH_USER = process.env.CH_USER ?? 'trace';
const CH_PASSWORD = process.env.CH_PASSWORD ?? 'trace';
const CH_DB = process.env.CH_DB ?? 'trace';
const TENANT = process.argv[2] ?? 'c7709802-bb1b-4b9c-8998-65f07d34b896';
const RANGE = process.argv[3] ?? '7d';

const INTERVALS = { '24h': '1 DAY', '7d': '7 DAY', '30d': '30 DAY' };
const tClause = INTERVALS[RANGE] ? `AND timestamp >= now() - INTERVAL ${INTERVALS[RANGE]}` : '';
const oClause = INTERVALS[RANGE] ? `AND start_time >= now() - INTERVAL ${INTERVALS[RANGE]}` : '';
const bucket = RANGE === '24h' ? 'toStartOfHour' : RANGE === '7d' ? 'x' : 'toStartOfDay';
const bucketExpr = (col) =>
  RANGE === '7d' ? `toStartOfInterval(${col}, INTERVAL 6 HOUR)` : `${bucket}(${col})`;

async function ch(query) {
  const url = `${CH_URL}/?user=${CH_USER}&password=${CH_PASSWORD}&database=${CH_DB}&default_format=JSON`;
  const res = await fetch(url, { method: 'POST', body: query });
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${await res.text()}`);
  return (await res.json()).data;
}
const num = (v) => Number(v ?? 0);

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.error(`  FAIL  ${name} — ${detail}`);
  }
}
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

async function main() {
  console.log(`Verifying dashboard metrics for tenant=${TENANT} range=${RANGE}\n`);

  // KPI summary (the server's exact formulas).
  const [summary] = await ch(`SELECT
     (SELECT count() FROM traces FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${tClause}) AS traces,
     (SELECT uniqExact(user_id) FROM traces FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 AND user_id!='' ${tClause}) AS users,
     (SELECT count() FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${oClause}) AS observations,
     (SELECT sum(total_cost) FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${oClause}) AS cost,
     (SELECT sum(total_tokens) FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${oClause}) AS tokens`);

  // Time-series buckets must sum to the KPI totals.
  const traceBuckets = await ch(
    `SELECT toString(${bucketExpr('timestamp')}) b, count() v FROM traces FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${tClause} GROUP BY b`,
  );
  const obsBuckets = await ch(
    `SELECT toString(${bucketExpr('start_time')}) b, count() c, sum(total_cost) cost, sum(total_tokens) tok FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${oClause} GROUP BY b`,
  );
  const sum = (rows, k) => rows.reduce((s, r) => s + num(r[k]), 0);

  check('Σ series.traces == KPI traces', sum(traceBuckets, 'v') === num(summary.traces), `${sum(traceBuckets, 'v')} vs ${num(summary.traces)}`);
  check('Σ series.observations == KPI observations', sum(obsBuckets, 'c') === num(summary.observations), `${sum(obsBuckets, 'c')} vs ${num(summary.observations)}`);
  check('Σ series.cost == KPI cost', close(sum(obsBuckets, 'cost'), num(summary.cost), 1e-6), `${sum(obsBuckets, 'cost')} vs ${num(summary.cost)}`);
  check('Σ series.tokens == KPI tokens', close(sum(obsBuckets, 'tok'), num(summary.tokens), 0.5), `${sum(obsBuckets, 'tok')} vs ${num(summary.tokens)}`);

  // Trace latency percentiles must be monotonic.
  const [lat] = await ch(
    `SELECT quantile(0.5)(l) p50, quantile(0.9)(l) p90, quantile(0.95)(l) p95, quantile(0.99)(l) p99 FROM (SELECT dateDiff('millisecond',min(start_time),max(end_time))/1000 l FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 ${oClause} GROUP BY trace_id)`,
  );
  check('latency p50 ≤ p90 ≤ p95 ≤ p99', num(lat.p50) <= num(lat.p90) && num(lat.p90) <= num(lat.p95) && num(lat.p95) <= num(lat.p99), JSON.stringify(lat));

  // Per-model latency rows monotonic.
  const modelLat = await ch(
    `SELECT model, quantile(0.5)(l) p50, quantile(0.95)(l) p95, quantile(0.99)(l) p99 FROM (SELECT model, dateDiff('millisecond',start_time,end_time)/1000 l FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 AND model!='' ${oClause}) GROUP BY model`,
  );
  check('model latencies monotonic (p50≤p95≤p99)', modelLat.every((r) => num(r.p50) <= num(r.p95) && num(r.p95) <= num(r.p99)), JSON.stringify(modelLat));

  // Model-cost breakdown reconciles: Σ model cost ≤ total (model-less spans add no cost).
  const modelUsage = await ch(
    `SELECT model, sum(total_cost) cost, sum(total_tokens) tok FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 AND model!='' ${oClause} GROUP BY model`,
  );
  check('Σ model cost ≤ KPI cost', sum(modelUsage, 'cost') <= num(summary.cost) + 1e-6, `${sum(modelUsage, 'cost')} vs ${num(summary.cost)}`);

  // User-consumption reconciles: Σ user cost ≤ total (user-less traces excluded).
  const userCons = await ch(
    `SELECT t.user_id u, count(DISTINCT t.id) tr, sum(o.cost) cost FROM (SELECT argMax(user_id,updated_at) user_id, argMax(timestamp,updated_at) timestamp, id FROM traces WHERE tenant_id='${TENANT}' GROUP BY id HAVING argMax(is_deleted,updated_at)=0) t LEFT JOIN (SELECT trace_id, sum(total_cost) cost FROM observations FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 GROUP BY trace_id) o ON o.trace_id=t.id WHERE t.user_id!='' ${tClause.replace('timestamp', 't.timestamp')} GROUP BY t.user_id`,
  );
  check('Σ user traces ≤ KPI traces', sum(userCons, 'tr') <= num(summary.traces), `${sum(userCons, 'tr')} vs ${num(summary.traces)}`);
  check('Σ user cost ≤ KPI cost', sum(userCons, 'cost') <= num(summary.cost) + 1e-6, `${sum(userCons, 'cost')} vs ${num(summary.cost)}`);

  // Scores breakdown count reconciles to the raw score count.
  const [{ c: scoreTotal } = {}] = await ch(
    `SELECT count() c FROM scores FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 AND name!='' ${tClause}`,
  );
  const scoreRows = await ch(
    `SELECT name, count() c FROM scores FINAL WHERE tenant_id='${TENANT}' AND is_deleted=0 AND name!='' ${tClause} GROUP BY name`,
  );
  check('Σ score-name counts == total scores', sum(scoreRows, 'c') === num(scoreTotal), `${sum(scoreRows, 'c')} vs ${num(scoreTotal)}`);

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
