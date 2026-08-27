import teamRegistry from '../../data/nfl/teams.json';
import previewRegistry from '../../data/previews/2026-team-previews.json';
import evidenceViews from '../../data/evidence/2026-generated-summaries.json';
import { rankScores, weightedProfileScore } from '../../lib/profile-market.mjs';
import { activeForecast, forecastValidation, kalshiSnapshot, publicCurrentState, readinessAudit, workflowSummary as generatedWorkflowSummary } from './generated-current';

export type CategoryId = string;

export type Team = {
  id: string;
  name: string;
  abbr: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
};

export type Evidence = {
  team: string;
  rank: number;
  tier: string;
  tierLabel: string;
  subject: string;
  people: string[];
  positives: string[];
  concerns: string[];
  context: string[];
  lines: [number, number];
};

export type PreviewBallot = {
  speaker:string;
  scope:string;
  complete:boolean;
  positions:{ rank:number; team:string }[];
  note?:string;
};

export type PreviewEvidence = {
  team:string;
  positives:string[];
  concerns:string[];
  context:string[];
};

export type PreviewSource = {
  id:string;
  label:string;
  short:string;
  publisher:string;
  kind:'team-preview';
  coverageMode:'division'|'multi-division';
  coveredTeams:string[];
  rankingScheme:'multi-ballot-division'|'partial-order';
  scoringEligible:false;
  analysisWeight:0;
  analysisRationale:string;
  marketAware:true;
  methodology:string;
  source:{ url:string; format:string; capturedAt:string; words?:number; lines?:number; durationSeconds?:number; bytes?:number; hash:string };
  ballots:PreviewBallot[];
  ambiguities:string[];
  evidence:PreviewEvidence[];
};

export type Market = {
  expectedWins: number;
  coverageLabel: string;
  thresholdCount: number;
  marketRank: number;
  marketIndex: number;
  expectedWinsBid: number;
  expectedWinsAsk: number;
  kalshiAverageSpread: number;
  distribution: { wins:number; probability:number }[];
  modeWins: number;
  modeProbability: number;
};

export type ForecastTeam = {
  team_id:string;
  strength_mean_points:number;
  strength_sd_points:number;
  win_probability_mass:number[];
  expected_wins:number;
  median_wins:number;
  interval_80:[number,number];
};

export type Forecast = {
  forecast_version_id:string;
  model_id:string;
  model_state:'research'|'provisional'|'validated';
  as_of:string;
  code_version:string;
  draws:number;
  decision_eligible:boolean;
  fit_summary:{ home_field_points:number; residual_sd_points:number; tie_probability:number; training_game_count:number };
  simulation_summary:{ schedule_games:number; expected_team_wins:number; expected_tied_games:number; coherence_error:number };
  teams:ForecastTeam[];
  warnings:string[];
};

export type ForecastValidation = {
  validation_report_id:string;
  structural_pass:boolean;
  quantitative_pass:boolean;
  holdout:{
    aggregate_metrics:Record<'model'|'league'|'prior_record'|'market',{ brier_score:number; log_loss:number; expected_calibration_error:number }>;
    interval_80_coverage:number;
    mean_rank_correlation:number;
  };
  gates:{
    quantitative:Record<string,{pass:boolean;[key:string]:unknown}>;
    current_adjustments:{pass:boolean;observed_teams:number;required_teams:number};
  };
};

export type ExecutionScenario = {
  requested_contracts:number;
  filled_contracts:number;
  unfilled_contracts:number;
  full_fill:boolean;
  levels_consumed:number;
  volume_weighted_price:number|null;
  worst_price:number|null;
  position_cost:number;
  formula_fee_estimate:number;
  conservative_rounding_reserve:number;
  conservative_total_fee:number;
  conservative_all_in_cost:number;
  conservative_break_even_probability:number|null;
  maximum_payout:number;
  maximum_profit:number|null;
};

export type ExecutionQuote = {
  quote_id:string;
  contract_id:string;
  team_id:string;
  threshold:number;
  side:'yes'|'no';
  bid:number|null;
  ask:number|null;
  bid_size:number|null;
  ask_size:number|null;
  spread:number|null;
  captured_at:string;
  stale_after:string;
  fee_schedule_id:string;
  movement:{ prior_quote_id:string|null;bid_change:number|null;ask_change:number|null;spread_change:number|null;ask_size_change:number|null };
  execution_scenarios:ExecutionScenario[];
};

export type ExecutionDiagnostic = {
  comparison_id:string;
  quote_id:string;
  team_id:string;
  contract_id:string;
  side:'yes'|'no';
  wins_at_least:number;
  requested_contracts:number;
  model_fair_probability:number;
  executable_price:number|null;
  conservative_break_even_probability:number|null;
  gross_edge:number|null;
  net_edge:number|null;
  spread:number|null;
  execution:ExecutionScenario;
  research_qualified:boolean;
  persistence:{qualifying_captures:number;required_captures:number;prior_comparison_id:string|null;spacing_seconds:number|null;spacing_valid:boolean};
  failed_gates:string[];
  action_eligible:boolean;
};

export type KalshiContract = {
  contract_id:string;
  event_ticker:string;
  team_id:string;
  wins_at_least:number;
  title:string;
  primary_settlement_rule:string;
  close_time:string;
};

export type WorkflowSummary = {
  schema_version:number;
  generated_at:string;
  public_manifest_id:string;
  today:{
    evidence_review_claims:number;
    evidence_review_teams:number;
    top_evidence_reviews:{team_id:string;claims:number;stale:number;review_due:number}[];
    forecast_state:string;
    forecast_decision_eligible:boolean;
    forecast_calibration_pass:boolean;
    forecast_current_adjustments:{pass:boolean;observed_teams:number;required_teams:number}|null;
    market_captured_at:string;
    market_stale_after:string;
    market_movement_rows:number;
    top_market_movers:{quote_id:string;team_id:string;threshold:number;side:'yes'|'no';ask:number|null;ask_change:number;spread:number|null}[];
    private_review_queue:string;
    warnings:string[];
  };
  opportunities:{status:'ready'|'disabled';action_eligible_candidates:number;research_diagnostics:number;persistent_research_diagnostics:number;disabled_reasons:string[]};
  weekly:{schema_version:number;generated_at:string|null;version_count:number;latest_version_id:string|null;versions:{weekly_state_version_id:string;season:number;period:{kind:string;week:number|null;label:string};frozen_at:string;path:string;content_fingerprint:string;public_manifest_id:string;forecast_version_id:string;market_snapshot_id:string}[]};
  learning:{schema_version:number;report_id:string;generated_at:string;policy_id:string;status:'awaiting_observations'|'ready';observation_count:number;overall:Record<string,number>|null;groupings:Record<string,unknown[]>;definitions:Record<string,string>};
};

export const teams: Team[] = teamRegistry.map(team => ({
  id: team.abbr.toLowerCase(),
  name: team.name,
  abbr: team.abbr,
  conference: team.conference as Team['conference'],
  division: team.division as Team['division'],
}));

export const kalshiMarketSource = {
  label: kalshiSnapshot.source.label,
  url: kalshiSnapshot.source.market_api_url,
  documentation: kalshiSnapshot.source.api_documentation,
  retrieved: new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', timeZoneName:'short' }).format(new Date(kalshiSnapshot.captured_at)),
  authenticated: false,
  feeScheduleId: kalshiSnapshot.fee_schedule_id,
  captureWindowSeconds: kalshiSnapshot.source.capture_window_seconds,
};

type KalshiSnapshotTeam = {
  coverage: { threshold_count:number; all_17_tails:boolean };
  expected_wins: { midpoint_estimate:number; bid_bound:number; ask_bound:number };
  average_spread:number;
  expected_win_rank:number;
  thresholds: { wins_at_least:number; adjusted_midpoint:number }[];
};

const kalshiTeams = kalshiSnapshot.teams as Record<string,KalshiSnapshotTeam>;
const distributionFor = (team:KalshiSnapshotTeam) => {
  const tails = [...team.thresholds].sort((a,b)=>a.wins_at_least-b.wins_at_least).map(threshold=>threshold.adjusted_midpoint);
  const probabilities = [1-tails[0],...tails.slice(0,-1).map((tail,index)=>tail-tails[index+1]),tails.at(-1)!];
  return probabilities.map((probability,wins)=>({ wins, probability:Math.max(0,Number(probability.toFixed(6))) }));
};

export const markets: Record<string, Market> = Object.fromEntries(Object.entries(kalshiTeams).map(([abbr,market]) => {
  const distribution = distributionFor(market);
  const mode = distribution.reduce((best,point)=>point.probability>best.probability?point:best);
  return [abbr,{
  expectedWins: market.expected_wins.midpoint_estimate,
  expectedWinsBid: market.expected_wins.bid_bound,
  expectedWinsAsk: market.expected_wins.ask_bound,
  coverageLabel: 'Kalshi full ladder',
  thresholdCount: market.coverage.threshold_count,
  marketRank: market.expected_win_rank,
  marketIndex: market.expected_wins.midpoint_estimate,
  kalshiAverageSpread: market.average_spread,
  distribution,
  modeWins: mode.wins,
  modeProbability: mode.probability,
}];})) as Record<string,Market>;

export const marketAudit = kalshiSnapshot.audit;
export const winAggregates = kalshiSnapshot.aggregates;
export const executionQuotes = kalshiSnapshot.quotes as unknown as ExecutionQuote[];
export const executionDiagnostics = kalshiSnapshot.diagnostics as unknown as ExecutionDiagnostic[];
const researchDiagnosticIds = new Set(kalshiSnapshot.research_diagnostic_ids as string[]);
export const researchDiagnostics = executionDiagnostics.filter(diagnostic=>researchDiagnosticIds.has(diagnostic.comparison_id));
export const kalshiContracts = kalshiSnapshot.contracts as unknown as KalshiContract[];
export const decisionSystemAudit = readinessAudit;
export const forecast = activeForecast as unknown as Forecast;
export const forecastValidationReport = forecastValidation as unknown as ForecastValidation;
export const forecastByTeam = Object.fromEntries(forecast.teams.map(team=>[team.team_id,team])) as Record<string,ForecastTeam>;
export const workflowSummary = generatedWorkflowSummary as unknown as WorkflowSummary;
export { publicCurrentState };

const generatedEvidence = evidenceViews.categories as unknown as Record<string,Evidence[]>;

export const qbEvidence = generatedEvidence.qb;
export const coachingEvidence = generatedEvidence.coaching;
export const olEvidence = generatedEvidence.ol;
export const skillEvidence = generatedEvidence.skill;
export const offenseEvidence = generatedEvidence.offense;
export const defenseEvidence = generatedEvidence.defense;

export type Category = {
  id:CategoryId;
  label:string;
  short:string;
  evidence:Evidence[];
  methodology:string;
  analysisWeight:number;
  analysisRationale:string;
  dependencyGroup:'offense-family'|'defense-family'|'cross-unit';
  dependencyNote:string;
  weightBasis:'reasoned-prior';
  kind:'unit-ranking';
  coverageMode:'league';
  coveredTeams:string[];
  rankingScheme:'league-ordinal';
  scoringEligible:true;
  marketAware:false;
  source:{ url:string; words:number; lines:number; hash:string };
};

export const categories: Category[] = [
  { id:'qb', label:'Quarterbacks', short:'QB', evidence:qbEvidence, analysisWeight:25, analysisRationale:'Largest single driver inside the 55-point offensive evidence budget; reduced from the prior 40-point model now that offense and defense have arrived.', dependencyGroup:'offense-family', dependencyNote:'Direct input to the offense episode, so QB and Offense are deliberately not given two full independent weights.', weightBasis:'reasoned-prior', methodology:'Starter and room quality, production, traits, health, playoff proof, trajectory and the degree to which the player creates beyond his environment.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/4e657898-f2f9-4a05-9cb6-e5a27f8c3cf2/transcript', words:11774, lines:2410, hash:'4599cad…0ec85c' } },
  { id:'coaching', label:'Coaching staffs', short:'Coach', evidence:coachingEvidence, analysisWeight:15, analysisRationale:'Cross-unit multiplier budgeted separately because the source covers offense, defense, game management, development and staff quality.', dependencyGroup:'cross-unit', dependencyNote:'Partly overlaps both new composite unit rankings; the lower 15-point prior prevents staff quality from being counted at its former standalone weight.', weightBasis:'reasoned-prior', methodology:'Whole-staff value: head coaching, game management, offensive and defensive play calling, hiring, culture, special teams and position-coach effects. Offense receives extra weight.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/536e0274-0383-4b97-904b-986237b1b6d8/transcript', words:12185, lines:2785, hash:'77504bab…9af7cb5' } },
  { id:'ol', label:'Offensive lines', short:'OL', evidence:olEvidence, analysisWeight:11, analysisRationale:'Structural protection and run-game input within the fixed offensive-family budget.', dependencyGroup:'offense-family', dependencyNote:'The offense episode explicitly reuses line quality, so the line and composite weights share one offensive budget.', weightBasis:'reasoned-prior', methodology:'Five-man weak-link quality, continuity, injuries and depth, coaching/scheme, with pass protection weighted for ceiling and run blocking for floor.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/736ccaf1-f5e8-4b45-813f-cc8e25075f74/transcript', words:12196, lines:2680, hash:'b97f5c4a…40c2c0' } },
  { id:'skill', label:'Skill positions', short:'Skill', evidence:skillEvidence, analysisWeight:8, analysisRationale:'Explosive and matchup value inside the offensive-family budget, with an explicit dependence discount for quarterback and structure.', dependencyGroup:'offense-family', dependencyNote:'The offense episode directly incorporates these weapons; the smallest default reflects both dependence and lower standalone causal leverage.', weightBasis:'reasoned-prior', methodology:'Every non-QB/non-line weapon. Receivers receive roughly half the weight; tight ends matter at least as much as backs because blocking and personnel flexibility count. Stars matter, depth matters more.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/98f3433e-7487-4c23-87ee-9bef34eaa4dc/transcript', words:12504, lines:2743, hash:'0f8ea7ff…1b891be' } },
  { id:'offense', label:'Offenses', short:'Off', evidence:offenseEvidence, analysisWeight:11, analysisRationale:'Residual interaction and schedule-adjusted unit outlook—not a second full copy of QB, line, weapons and play calling.', dependencyGroup:'offense-family', dependencyNote:'The source explicitly culminates QB, line, skill and offensive play calling. Its 11 points are a dependence-aware overlay within a fixed 55-point offensive budget, not an independent category-sized block.', weightBasis:'reasoned-prior', methodology:'A ceiling- and downside-oriented prediction of offensive DVOA using quarterback most, then passing over rushing, line, weapons, offensive play caller, history and schedule context. Tiers indicate near-neighbors.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pca.st/episode/1751101d-c30c-48a5-8f8c-3b3295b7de40', words:14130, lines:458, hash:'1eb89c29…fd46b1' } },
  { id:'defense', label:'Defenses', short:'Def', evidence:defenseEvidence, analysisWeight:30, analysisRationale:'Distinct full-unit signal with a large but sub-majority prior because defensive performance is important and explicitly volatile year to year.', dependencyGroup:'defense-family', dependencyNote:'Defense is the only dedicated defensive unit input. Coaching overlap remains, but it does not reuse the four offensive-family ranks.', weightBasis:'reasoned-prior', methodology:'A volatile full-unit forecast emphasizing proactive play, edges and corners, multi-position weapons, play-caller force multiplication, health and scheme fit. Confidence is much higher at the extremes than through the middle.', kind:'unit-ranking', coverageMode:'league', coveredTeams:teams.map(team=>team.abbr), rankingScheme:'league-ordinal', scoringEligible:true, marketAware:false, source:{ url:'https://pca.st/episode/133f5528-1659-4afb-8b6b-65796e0f279b', words:14206, lines:486, hash:'84fc0819…95eb0' } },
];

export const weightingModel = {
  version: 2,
  basis: 'Reasoned priors; no coefficient is fit to team outcomes, sportsbook prices or Kalshi.',
  groupBudgets: { offenseFamily:55, crossUnitCoaching:15, defense:30 },
  offenseDependenceRule: 'QB, offensive line, skill positions and the offense composite share one 55-point budget. The offense composite receives 11 points as an interaction/schedule overlay because its stated method directly reuses the other three inputs and offensive play calling.',
  equalWeightRole: 'A deliberate sensitivity stress test that ignores the default dependence correction; it is not the preferred model.',
};

export const scoredCategories = categories.filter(category=>category.scoringEligible);

export const previewSources: PreviewSource[] = previewRegistry.sources.map(raw=>({
  id:raw.id,
  label:raw.label,
  short:raw.short,
  publisher:raw.publisher,
  kind:raw.kind as PreviewSource['kind'],
  coverageMode:raw.coverage_mode as PreviewSource['coverageMode'],
  coveredTeams:raw.covered_teams,
  rankingScheme:raw.ranking_scheme as PreviewSource['rankingScheme'],
  scoringEligible:false,
  analysisWeight:0,
  analysisRationale:raw.analysis_rationale,
  marketAware:true,
  methodology:('methodology' in raw && typeof raw.methodology === 'string') ? raw.methodology : previewRegistry.methodology,
  source:{
    url:raw.source.url,
    format:raw.source.format,
    capturedAt:raw.source.captured_at,
    words:'words' in raw.source ? raw.source.words : undefined,
    lines:'lines' in raw.source ? raw.source.lines : undefined,
    durationSeconds:'duration_seconds' in raw.source ? raw.source.duration_seconds : undefined,
    bytes:'bytes' in raw.source ? raw.source.bytes : undefined,
    hash:raw.source.sha256,
  },
  ballots:raw.ballots,
  ambiguities:raw.ambiguities,
  evidence:evidenceViews.previews[raw.evidence_view_source_id as keyof typeof evidenceViews.previews] as unknown as PreviewEvidence[],
}));

export const sourceRegistry = [
  ...scoredCategories.map(category=>({id:category.id,kind:category.kind,coverageMode:category.coverageMode,coveredTeams:category.coveredTeams,rankingScheme:category.rankingScheme,scoringEligible:category.scoringEligible,analysisWeight:category.analysisWeight,marketAware:category.marketAware})),
  ...previewSources.map(source=>({id:source.id,kind:source.kind,coverageMode:source.coverageMode,coveredTeams:source.coveredTeams,rankingScheme:source.rankingScheme,scoringEligible:source.scoringEligible,analysisWeight:source.analysisWeight,marketAware:source.marketAware})),
];

export const sourceMeta: Record<CategoryId,{ label:string; source:string; words:number }> = Object.fromEntries(scoredCategories.map(category=>[category.id,{ label:category.label, source:category.source.url, words:category.source.words }]));

export const evidenceByCategory = Object.fromEntries(scoredCategories.map(c => [c.id, Object.fromEntries(c.evidence.map(e => [e.team, e]))])) as Record<CategoryId,Record<string,Evidence>>;

export const previewEvidenceByTeam = Object.fromEntries(teams.map(team=>[
  team.abbr,
  previewSources.flatMap(source=>source.evidence.filter(entry=>entry.team===team.abbr).map(entry=>({source,entry}))),
])) as Record<string,{source:PreviewSource;entry:PreviewEvidence}[]>;

export function compositeFor(abbr: string) {
  const ranks = scoredCategories.map(c => evidenceByCategory[c.id][abbr].rank);
  return Number((ranks.reduce((a,b)=>a+b,0)/ranks.length).toFixed(2));
}

export const defaultAnalysisWeights = Object.fromEntries(scoredCategories.map(category=>[category.id,category.analysisWeight]));

export function profileScoreFor(abbr:string, weights:Record<string,number> = defaultAnalysisWeights) {
  const ranks = Object.fromEntries(scoredCategories.map(category=>[category.id,evidenceByCategory[category.id][abbr].rank]));
  return weightedProfileScore(ranks,scoredCategories,weights);
}

export function profileRanksFor(weights:Record<string,number> = defaultAnalysisWeights) {
  return rankScores(Object.fromEntries(teams.map(team=>[team.abbr,profileScoreFor(team.abbr,weights)])));
}

export const defaultProfileRanks = profileRanksFor();

export const scoredClaimCount = scoredCategories.reduce((total,c) => total + c.evidence.reduce((n,e) => n + e.positives.length + e.concerns.length + e.context.length,0),0);
export const previewClaimCount = previewSources.reduce((total,source)=>total+source.evidence.reduce((count,entry)=>count+entry.positives.length+entry.concerns.length+entry.context.length,0),0);
export const claimCount = scoredClaimCount + previewClaimCount;
