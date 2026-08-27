import { useMemo, useState } from 'react';
import './learning.css';

type View = 'today' | 'theses' | 'portfolio' | 'learning';

const formatPrice = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}¢`;
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not scheduled';
const stateLabel = (value: string) => value.replaceAll('-', ' ');

function SummaryCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="summaryCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function EmptyState({ title, copy, command = 'npm run decision:template -- thesis.created' }: { title: string; copy: string; command?: string }) {
  return <div className="emptyState"><span>Nothing recorded</span><h2>{title}</h2><p>{copy}</p><code>{command}</code></div>;
}

function TodayView({ state }: { state: DecisionState }) {
  const overdue = useMemo(() => state.review_queue.filter(item => new Date(item.review_due_at) <= new Date()), [state.review_queue]);
  if (state.theses.length === 0) return <EmptyState title="The private ledger is ready." copy="Create a private draft template, fill it in locally, and append it after review. No decision data is stored in the public report." />;
  return <section>
    <header className="sectionHeader"><div><span>Today</span><h2>Review what can change the decision.</h2></div><p>The queue is derived from the append-only ledger. Revisions and corrections create new events; prior beliefs remain reconstructable.</p></header>
    <div className="summaryGrid">
      <SummaryCard label="Active theses" value={state.summary.active_theses} note={`${state.summary.thesis_count} recorded total`} />
      <SummaryCard label="Review queue" value={state.summary.review_queue_count} note={`${overdue.length} currently overdue`} />
      <SummaryCard label="Open positions" value={state.summary.open_positions} note="Manual fills only" />
      <SummaryCard label="Maximum open loss" value={state.summary.maximum_open_loss.toFixed(2)} note="In contract-price units" />
    </div>
    <div className="queueList">{state.review_queue.map(item => <article key={item.thesis_id}><div><span>{item.lifecycle_state}</span><h3>{item.title}</h3></div><time dateTime={item.review_due_at}>{formatDate(item.review_due_at)}</time></article>)}</div>
  </section>;
}

function ThesesView({ state }: { state: DecisionState }) {
  if (state.theses.length === 0) return <EmptyState title="No thesis has been created." copy="The first event must state the case, contrary case, fair range, target, hard limit, catalyst, invalidation, confidence, risk cap, and correlation tags." />;
  return <section>
    <header className="sectionHeader"><div><span>Theses</span><h2>Beliefs, limits, and invalidation.</h2></div><p>Passes remain visible so later process review does not condition only on wagers that were placed.</p></header>
    <div className="thesisList">{state.theses.map(thesis => <article key={thesis.thesis_id}>
      <header><div><span>{thesis.team_id} · {stateLabel(thesis.lifecycle_state)}</span><h3>{thesis.title}</h3></div><b>{thesis.event_count} events</b></header>
      <div className="caseGrid"><div><strong>Case</strong><p>{thesis.thesis}</p></div><div><strong>Contrary case</strong><p>{thesis.contrary_case}</p></div></div>
      <dl><div><dt>Fair range</dt><dd>{formatPrice(thesis.fair_price_range.low)}–{formatPrice(thesis.fair_price_range.high)}</dd></div><div><dt>Target / limit</dt><dd>{formatPrice(thesis.target_price)} / {formatPrice(thesis.limit_price)}</dd></div><div><dt>Confidence</dt><dd>{thesis.confidence.level}</dd></div><div><dt>Risk cap</dt><dd>{thesis.risk_cap.amount} {thesis.risk_cap.unit}</dd></div></dl>
      <div className="conditions"><p><strong>Catalyst</strong>{thesis.catalyst}</p><p><strong>Invalidation</strong>{thesis.invalidation}</p></div>
      <footer><span>{thesis.correlation_tags.join(' · ') || 'No correlation tags'}</span><time dateTime={thesis.last_event_at}>{formatDate(thesis.last_event_at)}</time></footer>
    </article>)}</div>
  </section>;
}

function PortfolioView({ state }: { state: DecisionState }) {
  if (state.positions.length === 0) return <EmptyState title="No position is open." copy="Positions are derived from recorded fills and closes. The MVP never connects to an exchange or places an order." />;
  return <section>
    <header className="sectionHeader"><div><span>Portfolio</span><h2>Exposure before opportunity.</h2></div><p>Correlation tags reveal shared team, division, quarterback, injury, and thesis drivers without pretending a covariance model exists.</p></header>
    <div className="positionList">{state.positions.map(position => <article key={position.thesis_id}><span>{position.team_id}</span><h3>{position.title}</h3><dl><div><dt>Open size</dt><dd>{position.position.open_size}</dd></div><div><dt>Average entry</dt><dd>{formatPrice(position.position.average_entry_price)}</dd></div><div><dt>Latest mark</dt><dd>{formatPrice(position.position.latest_mark_price)}</dd></div><div><dt>Maximum loss</dt><dd>{position.position.maximum_open_loss.toFixed(2)}</dd></div></dl><footer>{position.correlation_tags.join(' · ')}</footer></article>)}</div>
    <div className="exposureList"><h3>Shared drivers</h3>{state.correlation_exposure.map(item => <div key={item.tag}><span>{item.tag}</span><strong>{item.maximum_open_loss.toFixed(2)}</strong></div>)}</div>
  </section>;
}

function LearningView({ state }: { state: DecisionState }) {
  if (state.learning.length === 0) return <EmptyState title="The learning loop is ready for a real close." copy="After a filled thesis has a same-side closing price and settlement, this view derives CLV, outcome coverage, realized P&L and the postmortem queue without rewriting the original decision." command="npm run decision:template -- closing_price.recorded" />;
  return <section>
    <header className="sectionHeader"><div><span>Learning</span><h2>Judge the process against the close and outcome.</h2></div><p>Closing prices use the same contract side as the fill. Positive CLV means the closing market probability moved above the average entry price; it does not guarantee a winning settlement.</p></header>
    <div className="summaryGrid">
      <SummaryCard label="Closing prices" value={state.summary.closing_price_count} note={`${state.learning.length} filled theses in review`} />
      <SummaryCard label="Outcomes" value={state.summary.outcome_count} note="Manual source-backed settlement records" />
      <SummaryCard label="Postmortems" value={state.summary.postmortem_count} note={`${state.summary.postmortem_queue_count} still due`} />
      <SummaryCard label="Ledger events" value={state.ledger.event_count} note="Original decisions remain immutable" />
    </div>
    <div className="learningList">{state.learning.map(record => <article key={record.thesis_id}>
      <header><div><span>{record.team_id} · {stateLabel(record.lifecycle_state)}</span><h3>{record.title}</h3></div><b>{record.outcome?.result ?? 'Outcome pending'}</b></header>
      <dl><div><dt>Average entry</dt><dd>{formatPrice(record.average_entry_price)}</dd></div><div><dt>Same-side close</dt><dd>{formatPrice(record.closing_price)}</dd></div><div><dt>CLV / contract</dt><dd>{record.clv_per_contract === null ? '—' : `${record.clv_per_contract >= 0 ? '+' : ''}${(record.clv_per_contract * 100).toFixed(1)}¢`}</dd></div><div><dt>Total CLV</dt><dd>{record.clv_total === null ? '—' : record.clv_total.toFixed(2)}</dd></div><div><dt>Realized P&L</dt><dd>{record.realized_pnl === null ? '—' : record.realized_pnl.toFixed(2)}</dd></div></dl>
      <footer><span>{record.weekly_state_version_id ?? 'Legacy fixture · no weekly version'}</span><small>{record.postmortem ? 'Postmortem recorded' : 'Postmortem due after outcome'}</small></footer>
    </article>)}</div>
  </section>;
}

export default function DecisionApp({ state, manifest }: { state: DecisionState; manifest: PrivateManifest }) {
  const [view, setView] = useState<View>('today');
  return <main>
    <header className="masthead"><div><span>Local only · private decision system</span><h1>Make the decision reconstructable.</h1><p>This artifact contains private data. It is generated under <code>.private/</code>, is not publishable, and never places an order.</p></div><aside><strong>{state.ledger.valid ? 'Ledger valid' : 'Ledger invalid'}</strong><small>{state.ledger.event_count} immutable events</small><small>Forecast {manifest.public_manifest.forecast.status} · {manifest.public_manifest.forecast.decision_eligible?'eligible':'lab only'}</small><small>Kalshi execution · {manifest.public_manifest.market.action_eligible_candidates} action eligible</small><small>Weekly state {manifest.public_manifest.weekly_state.version_id ?? 'not frozen'}</small><small>Public state {manifest.public_manifest.manifest_id}</small></aside></header>
    <nav aria-label="Private decision views">{(['today', 'theses', 'portfolio', 'learning'] as View[]).map(option => <button type="button" className={view === option ? 'active' : ''} onClick={() => setView(option)} key={option}>{option}</button>)}</nav>
    <div className="shell">{view === 'today' ? <TodayView state={state} /> : view === 'theses' ? <ThesesView state={state} /> : view === 'portfolio' ? <PortfolioView state={state} /> : <LearningView state={state} />}</div>
    <footer><span>Local data only</span><p>Canonical records: append-only JSON Lines. Current views: deterministic materializations.</p></footer>
  </main>;
}
