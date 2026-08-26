import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rankScores, weightedProfileScore } from '../lib/profile-market.mjs';
import previewRegistry from '../data/previews/2026-team-previews.json' with { type: 'json' };

const [marketPath, outputPath] = process.argv.slice(2);
if (!marketPath || !outputPath) {
  throw new Error('Usage: node scripts/audit-profile-sensitivity.mjs KALSHI_SNAPSHOT OUTPUT_JSON');
}

const categoryContract = [
  { id: 'qb', rankingFile: '2026-qb.json', analysisWeight: 25 },
  { id: 'coaching', rankingFile: '2026-coaching.json', analysisWeight: 15 },
  { id: 'ol', rankingFile: '2026-offensive-line.json', analysisWeight: 11 },
  { id: 'skill', rankingFile: '2026-skill-positions.json', analysisWeight: 8 },
  { id: 'offense', rankingFile: '2026-offense.json', analysisWeight: 11 },
  { id: 'defense', rankingFile: '2026-defense.json', analysisWeight: 30 },
];

const categoryRanks = {};
for (const category of categoryContract) {
  const ranking = JSON.parse(await readFile(resolve('data/rankings', category.rankingFile), 'utf8'));
  const ranks = Object.fromEntries(ranking.order.map((team, index)=>[team,index+1]));
  if (Object.keys(ranks).length !== 32 || new Set(Object.values(ranks)).size !== 32) {
    throw new Error(`${category.id} must contain 32 unique ranks`);
  }
  categoryRanks[category.id] = ranks;
}

const teams = Object.keys(categoryRanks.qb).sort();
const previewSources = previewRegistry.sources;
const previewTeams = new Set(previewSources.flatMap(source=>source.covered_teams));
if (previewSources.some(source=>source.scoring_eligible || source.analysis_weight !== 0 || !source.market_aware)) {
  throw new Error('Every market-aware preview must remain scoring-ineligible at analysis weight 0');
}
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
    preview_sources_registered: previewSources.length,
    preview_teams_covered: previewTeams.size,
    preview_sources_scoring_eligible: previewSources.filter(source=>source.scoring_eligible).length,
    preview_analysis_weight: previewSources.reduce((total,source)=>total+source.analysis_weight,0),
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
