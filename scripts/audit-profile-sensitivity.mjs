import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rankScores, weightedProfileScore } from '../lib/profile-market.mjs';

const [marketPath, outputPath] = process.argv.slice(2);
if (!marketPath || !outputPath) {
  throw new Error('Usage: node scripts/audit-profile-sensitivity.mjs KALSHI_SNAPSHOT OUTPUT_JSON');
}

const categoryContract = [
  { id: 'qb', exportName: 'qbEvidence', analysisWeight: 40 },
  { id: 'coaching', exportName: 'coachingEvidence', analysisWeight: 25 },
  { id: 'ol', exportName: 'olEvidence', analysisWeight: 20 },
  { id: 'skill', exportName: 'skillEvidence', analysisWeight: 15 },
];

const dataSource = await readFile(resolve('site/app/data.ts'), 'utf8');
const categoryRanks = {};
for (const category of categoryContract) {
  const start = dataSource.indexOf(`export const ${category.exportName}: Evidence[] = [`);
  const end = dataSource.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error(`Could not find ${category.exportName}`);
  const ranks = {};
  for (const match of dataSource.slice(start, end).matchAll(/E\('([A-Z]{2,3})',(\d+),/g)) {
    ranks[match[1]] = Number(match[2]);
  }
  if (Object.keys(ranks).length !== 32 || new Set(Object.values(ranks)).size !== 32) {
    throw new Error(`${category.id} must contain 32 unique ranks`);
  }
  categoryRanks[category.id] = ranks;
}

const teams = Object.keys(categoryRanks.qb).sort();
const scoreAll = overrides => Object.fromEntries(teams.map(team=>[
  team,
  weightedProfileScore(Object.fromEntries(categoryContract.map(category=>[category.id,categoryRanks[category.id][team]])),categoryContract,overrides),
]));
const defaultRanks = rankScores(scoreAll({}));
const equalRanks = rankScores(scoreAll(Object.fromEntries(categoryContract.map(category=>[category.id,1]))));
const sensitivity = teams.map(team=>({
  team,
  weighted_rank:defaultRanks[team],
  equal_weight_rank:equalRanks[team],
  movement:equalRanks[team]-defaultRanks[team],
})).sort((left,right)=>Math.abs(right.movement)-Math.abs(left.movement)||left.team.localeCompare(right.team));

const kalshi = JSON.parse(await readFile(resolve(marketPath), 'utf8'));
const thresholdAudits = Array.from({ length: 17 }, (_, index)=>index+1).map(threshold=>{
  const probabilities = Object.fromEntries(teams.map(team=>[
    team,
    kalshi.teams[team].thresholds.find(point=>point.wins_at_least===threshold).adjusted_midpoint,
  ]));
  const tailRanks = rankScores(probabilities);
  const gaps = teams.map(team=>({team,profile_rank:defaultRanks[team],tail_rank:tailRanks[team],gap:tailRanks[team]-defaultRanks[team],probability:probabilities[team]}))
    .sort((left,right)=>Math.abs(right.gap)-Math.abs(left.gap)||left.team.localeCompare(right.team));
  return {
    wins_at_least: threshold,
    largest_absolute_rank_gap: Math.abs(gaps[0].gap),
    largest_gap_team: gaps[0].team,
    largest_signed_gap: gaps[0].gap,
    teams_with_absolute_gap_at_least_6: gaps.filter(row=>Math.abs(row.gap)>=6).length,
    rows: gaps,
  };
});

const audit = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  kalshi_snapshot: resolve(marketPath).split('/').at(-1),
  registry: {
    scored_categories: categoryContract.map(({id,analysisWeight})=>({id,analysis_weight:analysisWeight})),
    preview_sources_registered: 2,
    preview_sources_scoring_eligible: 0,
    preview_analysis_weight: 0,
    league_profile_changed_by_previews: false,
  },
  weighted_equal_sensitivity: {
    teams: 32,
    threshold_rank_movement: 5,
    teams_moving_at_least_5: sensitivity.filter(row=>Math.abs(row.movement)>=5).length,
    largest_absolute_movement: Math.abs(sensitivity[0].movement),
    largest_movement_team: sensitivity[0].team,
    rows: sensitivity,
  },
  kalshi_tail_comparisons: thresholdAudits,
};

const resolvedOutput = resolve(outputPath);
try {
  await access(resolvedOutput);
  throw new Error(`Refusing to overwrite existing audit: ${resolvedOutput}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(resolvedOutput, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  generated_at:audit.generated_at,
  weighted_equal_movers:audit.weighted_equal_sensitivity.teams_moving_at_least_5,
  largest_weight_movement:`${audit.weighted_equal_sensitivity.largest_movement_team} ${audit.weighted_equal_sensitivity.largest_absolute_movement}`,
  tail_11:audit.kalshi_tail_comparisons.find(item=>item.wins_at_least===11),
  output:resolvedOutput,
}, null, 2));
