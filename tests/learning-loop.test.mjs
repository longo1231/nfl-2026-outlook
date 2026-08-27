import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildLearningReport, scoreLearningObservations, validateLearningObservation, validateLearningPolicy } from '../lib/learning-loop.mjs';
import { buildWeeklyIndex, hashWeeklyContent, validateWeeklyStateVersion } from '../lib/weekly-state.mjs';

const policy = JSON.parse(await readFile(new URL('../config/learning-policy.json', import.meta.url), 'utf8'));
const observations = [
  {
    schema_version: 1,
    observation_id: 'learning_fixture_001',
    recorded_at: '2027-01-18T05:02:00Z',
    season: 2026,
    weekly_state_version_id: 'weekly-fixture-1',
    model_version_id: 'forecast-fixture-1',
    decision_market_snapshot_id: 'market-fixture-1',
    closing_market_snapshot_id: 'market-fixture-close-1',
    team_id: 'TST',
    contract_id: 'FIXTURE-YES-9',
    market_type: 'regular-season-wins-tail',
    side: 'yes',
    threshold: 9,
    evaluation_horizon: 'preseason-close',
    confidence_bucket: 'medium',
    model_probability: 0.6,
    closing_probability: 0.7,
    closing_quote_id: 'quote-fixture-close-1',
    closing_observed_at: '2027-01-18T04:58:00Z',
    outcome: 1,
    settled_at: '2027-01-18T05:01:00Z',
    source: { venue_id: 'kalshi', close_source: 'fixture close', outcome_source: 'fixture settlement' },
  },
  {
    schema_version: 1,
    observation_id: 'learning_fixture_002',
    recorded_at: '2027-01-18T05:03:00Z',
    season: 2026,
    weekly_state_version_id: 'weekly-fixture-1',
    model_version_id: 'forecast-fixture-1',
    decision_market_snapshot_id: 'market-fixture-1',
    closing_market_snapshot_id: 'market-fixture-close-1',
    team_id: 'TST',
    contract_id: 'FIXTURE-NO-7',
    market_type: 'regular-season-wins-tail',
    side: 'no',
    threshold: 7,
    evaluation_horizon: 'decision-to-close',
    confidence_bucket: 'high',
    model_probability: 0.8,
    closing_probability: 0.75,
    closing_quote_id: 'quote-fixture-close-2',
    closing_observed_at: '2027-01-18T04:58:30Z',
    outcome: 0,
    settled_at: '2027-01-18T05:01:30Z',
    source: { venue_id: 'kalshi', close_source: 'fixture close', outcome_source: 'fixture settlement' },
  },
];

test('learning observations and policy enforce frozen public evaluation fields', () => {
  assert.equal(validateLearningPolicy(policy), true);
  assert.equal(validateLearningObservation(observations[0], { policy }), true);
  assert.throws(() => validateLearningObservation({ ...observations[0], outcome: 2 }, { policy }), /binary/);
});

test('learning report calculates scores and required breakdowns without private entries', () => {
  const metrics = scoreLearningObservations(observations, policy);
  assert.equal(metrics.observations, 2);
  assert.equal(metrics.model_brier_score, 0.4);
  assert.equal(metrics.closing_brier_score, 0.32625);
  assert.equal(metrics.mean_model_to_close_probability_delta, 0.025);
  const report = buildLearningReport(observations, policy);
  assert.equal(report.status, 'ready');
  assert.equal(report.observation_count, 2);
  assert.deepEqual(Object.keys(report.groupings), policy.required_dimensions);
  assert.equal(buildLearningReport([], policy).status, 'awaiting_observations');
});

test('weekly state versions are content-addressed and index without mutation', () => {
  const ref = id => ({ id, path: `data/fixture/${id}.json`, sha256: 'a'.repeat(64) });
  const content = {
    schema_version: 1,
    season: 2026,
    period: { kind: 'preseason-prior', week: null, label: 'Fixture preseason prior' },
    frozen_at: '2026-08-27T16:30:09Z',
    public_manifest: ref('manifest-fixture'),
    evidence: ref('evidence-fixture'),
    forecast: ref('forecast-fixture'),
    market: ref('market-fixture'),
    readiness: ref('readiness-fixture'),
    policies: [ref('policy-fixture')],
  };
  const fingerprint = hashWeeklyContent(content);
  const version = { ...content, weekly_state_version_id: `weekly-fixture-${fingerprint.slice(0, 16)}`, content_fingerprint: fingerprint };
  assert.equal(validateWeeklyStateVersion(version), true);
  const index = buildWeeklyIndex([version]);
  assert.equal(index.version_count, 1);
  assert.equal(index.latest_version_id, version.weekly_state_version_id);
  assert.throws(() => validateWeeklyStateVersion({ ...version, period: { ...version.period, label: 'Changed' } }), /fingerprint/);
});
