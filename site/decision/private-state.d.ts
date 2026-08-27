declare const __DECISION_STATE__: DecisionState;
declare const __PRIVATE_MANIFEST__: PrivateManifest;

type LifecycleState = 'draft' | 'watch' | 'approved' | 'open' | 'passed' | 'invalidated' | 'closed';

type Thesis = {
  thesis_id: string;
  title: string;
  team_id: string;
  lifecycle_state: LifecycleState;
  thesis: string;
  contrary_case: string;
  catalyst: string;
  invalidation: string;
  fair_price_range: { low: number; high: number; basis: string };
  target_price: number;
  limit_price: number;
  confidence: { level: string; rationale: string };
  risk_cap: { amount: number; unit: string };
  correlation_tags: string[];
  review_due_at: string | null;
  last_event_at: string;
  event_count: number;
  position: {
    filled_size: number;
    closed_size: number;
    open_size: number;
    average_entry_price: number | null;
    latest_mark_price: number | null;
    closing_price: number | null;
    maximum_open_loss: number;
    unrealized_pnl: number | null;
    realized_pnl: number | null;
    clv_per_contract: number | null;
    clv_total: number | null;
  };
};

type DecisionState = {
  schema_version: 1;
  generated_at: string | null;
  ledger: { event_count: number; head_hash: string | null; valid: boolean };
  summary: { thesis_count: number; active_theses: number; passed_theses: number; open_positions: number; maximum_open_loss: number; review_queue_count: number; closing_price_count: number; outcome_count: number; postmortem_count: number; postmortem_queue_count: number };
  theses: Thesis[];
  positions: Array<Pick<Thesis, 'thesis_id' | 'title' | 'team_id' | 'lifecycle_state' | 'correlation_tags' | 'position'>>;
  correlation_exposure: { tag: string; maximum_open_loss: number }[];
  review_queue: { thesis_id: string; title: string; review_due_at: string; lifecycle_state: string }[];
  learning: { thesis_id: string; title: string; team_id: string; lifecycle_state: string; forecast_version_id: string | null; weekly_state_version_id: string | null; market_snapshot_id: string | null; filled_size: number; average_entry_price: number | null; closing_price: number | null; clv_per_contract: number | null; clv_total: number | null; realized_pnl: number | null; outcome: { result: string; at: string } | null; postmortem: { summary: string; at: string } | null }[];
};

type PrivateManifest = {
  schema_version: 1;
  generated_at: string;
  public_manifest: {
    manifest_id: string;
    path: string;
    forecast: { version_id: string | null; status: 'missing' | 'research' | 'provisional' | 'validated'; decision_eligible: boolean };
    market: { venue_id: 'kalshi'; snapshot_id: string; status: 'execution-aware'; fee_schedule_id: string; action_eligible_candidates: number };
    weekly_state: { version_id: string | null; index_path: string };
    learning_policy_id: string;
  };
  ledger: { path: string; event_count: number; head_hash: string | null };
  materialized: { path: string; schema_version: number };
  local_app: { output_path: string; contains_private_data: true; publishable: false };
};
