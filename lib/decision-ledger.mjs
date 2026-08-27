import { validateDecisionEventChain } from './system-contracts.mjs';

const clone = value => structuredClone(value);
const round = (value, places = 6) => Number(value.toFixed(places));

const deepMerge = (target, changes) => {
  const next = clone(target);
  for (const [key, value] of Object.entries(changes)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value) && next[key] && typeof next[key] === 'object' && !Array.isArray(next[key])
      ? deepMerge(next[key], value)
      : clone(value);
  }
  return next;
};

export function materializeDecisionLedger(events) {
  const chain = validateDecisionEventChain(events);
  const theses = new Map();

  for (const event of events) {
    const existing = theses.get(event.entity_id);
    if (event.event_type === 'thesis.created') {
      if (existing) throw new Error('A thesis entity may only be created once');
      theses.set(event.entity_id, {
        thesis_id: event.entity_id,
        ...clone(event.payload),
        lifecycle_state: 'draft',
        decision: null,
        created_at: event.occurred_at,
        last_event_at: event.occurred_at,
        public_refs: clone(event.public_refs),
        event_count: 1,
        orders: [],
        fills: [],
        closes: [],
        latest_mark: null,
        closing_price: null,
        outcome: null,
        postmortem: null,
      });
      continue;
    }
    if (!existing) throw new Error(`Decision event ${event.event_type} references a thesis that has not been created`);
    existing.last_event_at = event.occurred_at;
    existing.public_refs = clone(event.public_refs);
    existing.event_count += 1;
    if (event.event_type === 'thesis.revised') {
      const reserved = new Set(['thesis_id', 'lifecycle_state', 'decision', 'created_at', 'last_event_at', 'public_refs', 'event_count', 'orders', 'fills', 'closes', 'closing_price', 'position']);
      const illegal = Object.keys(event.payload.changes).filter(key => reserved.has(key));
      if (illegal.length > 0) throw new Error(`Thesis revision cannot replace reserved fields: ${illegal.join(', ')}`);
      const revised = deepMerge(existing, event.payload.changes);
      Object.assign(existing, revised, { revision_reason: event.payload.reason });
    } else if (event.event_type === 'thesis.invalidated') {
      existing.lifecycle_state = 'invalidated';
      existing.invalidation_record = { reason: event.payload.reason, at: event.occurred_at };
    } else if (event.event_type.startsWith('decision.')) {
      const decisionState = event.event_type.split('.')[1];
      existing.decision = { state: decisionState, ...clone(event.payload), at: event.occurred_at };
      existing.lifecycle_state = decisionState === 'approve' ? 'approved' : decisionState === 'pass' ? 'passed' : decisionState;
    } else if (event.event_type === 'order.recorded') {
      existing.orders.push({ ...clone(event.payload), at: event.occurred_at });
    } else if (event.event_type === 'fill.recorded') {
      existing.fills.push({ ...clone(event.payload), at: event.occurred_at });
      existing.lifecycle_state = 'open';
    } else if (event.event_type === 'position.marked') {
      existing.latest_mark = { ...clone(event.payload), at: event.occurred_at };
    } else if (event.event_type === 'closing_price.recorded') {
      existing.closing_price = { ...clone(event.payload), at: event.occurred_at };
    } else if (event.event_type === 'position.closed') {
      existing.closes.push({ ...clone(event.payload), at: event.occurred_at });
    } else if (event.event_type === 'outcome.recorded') {
      existing.outcome = { ...clone(event.payload), at: event.occurred_at };
    } else if (event.event_type === 'postmortem.recorded') {
      existing.postmortem = { ...clone(event.payload), at: event.occurred_at };
    }
  }

  const materializedTheses = [...theses.values()].map(thesis => {
    const filledSize = thesis.fills.reduce((sum, fill) => sum + fill.size, 0);
    const filledCost = thesis.fills.reduce((sum, fill) => sum + fill.price * fill.size, 0);
    const closedSize = thesis.closes.reduce((sum, close) => sum + close.size, 0);
    const openSize = Math.max(0, filledSize - closedSize);
    const averageEntryPrice = filledSize > 0 ? filledCost / filledSize : null;
    const latestMarkPrice = thesis.latest_mark?.price ?? null;
    const closingPrice = thesis.closing_price?.price ?? null;
    const realizedPnl = closedSize > 0 && averageEntryPrice !== null
      ? thesis.closes.reduce((sum, close) => sum + (close.price - averageEntryPrice) * close.size, 0)
      : null;
    const clvPerContract = closingPrice !== null && averageEntryPrice !== null ? closingPrice - averageEntryPrice : null;
    const clvTotal = clvPerContract === null ? null : clvPerContract * filledSize;
    const unrealizedPnl = openSize > 0 && averageEntryPrice !== null && latestMarkPrice !== null
      ? (latestMarkPrice - averageEntryPrice) * openSize
      : null;
    if (filledSize > 0 && openSize === 0) thesis.lifecycle_state = 'closed';
    return {
      ...thesis,
      position: {
        filled_size: round(filledSize),
        closed_size: round(closedSize),
        open_size: round(openSize),
        average_entry_price: averageEntryPrice === null ? null : round(averageEntryPrice),
        latest_mark_price: latestMarkPrice,
        closing_price: closingPrice,
        maximum_open_loss: averageEntryPrice === null ? 0 : round(averageEntryPrice * openSize),
        unrealized_pnl: unrealizedPnl === null ? null : round(unrealizedPnl),
        realized_pnl: realizedPnl === null ? null : round(realizedPnl),
        clv_per_contract: clvPerContract === null ? null : round(clvPerContract),
        clv_total: clvTotal === null ? null : round(clvTotal),
      },
    };
  }).sort((left, right) => right.last_event_at.localeCompare(left.last_event_at));

  const openPositions = materializedTheses.filter(thesis => thesis.position.open_size > 0);
  const correlationExposure = {};
  for (const thesis of openPositions) {
    for (const tag of thesis.correlation_tags) {
      correlationExposure[tag] = round((correlationExposure[tag] ?? 0) + thesis.position.maximum_open_loss);
    }
  }
  const terminalStates = new Set(['passed', 'invalidated', 'closed']);
  const reviewQueue = materializedTheses
    .filter(thesis => !terminalStates.has(thesis.lifecycle_state) && thesis.review_due_at)
    .map(thesis => ({ thesis_id: thesis.thesis_id, title: thesis.title, review_due_at: thesis.review_due_at, lifecycle_state: thesis.lifecycle_state }));

  const learningRecords = materializedTheses
    .filter(thesis => thesis.closing_price || thesis.outcome || thesis.postmortem || thesis.position.filled_size > 0)
    .map(thesis => ({
      thesis_id: thesis.thesis_id,
      title: thesis.title,
      team_id: thesis.team_id,
      lifecycle_state: thesis.lifecycle_state,
      forecast_version_id: thesis.public_refs.forecast_version_id,
      weekly_state_version_id: thesis.public_refs.weekly_state_version_id ?? null,
      market_snapshot_id: thesis.public_refs.market_snapshot_id ?? null,
      filled_size: thesis.position.filled_size,
      average_entry_price: thesis.position.average_entry_price,
      closing_price: thesis.position.closing_price,
      clv_per_contract: thesis.position.clv_per_contract,
      clv_total: thesis.position.clv_total,
      realized_pnl: thesis.position.realized_pnl,
      outcome: thesis.outcome,
      postmortem: thesis.postmortem,
    }));

  return {
    schema_version: 1,
    generated_at: events.at(-1)?.recorded_at ?? null,
    ledger: { ...chain, valid: true },
    summary: {
      thesis_count: materializedTheses.length,
      active_theses: materializedTheses.filter(thesis => !terminalStates.has(thesis.lifecycle_state)).length,
      passed_theses: materializedTheses.filter(thesis => thesis.lifecycle_state === 'passed').length,
      open_positions: openPositions.length,
      maximum_open_loss: round(openPositions.reduce((sum, thesis) => sum + thesis.position.maximum_open_loss, 0)),
      review_queue_count: reviewQueue.length,
      closing_price_count: materializedTheses.filter(thesis => thesis.closing_price).length,
      outcome_count: materializedTheses.filter(thesis => thesis.outcome).length,
      postmortem_count: materializedTheses.filter(thesis => thesis.postmortem).length,
      postmortem_queue_count: materializedTheses.filter(thesis => thesis.outcome && !thesis.postmortem).length,
    },
    theses: materializedTheses,
    positions: openPositions.map(thesis => ({
      thesis_id: thesis.thesis_id,
      title: thesis.title,
      team_id: thesis.team_id,
      market: thesis.market,
      lifecycle_state: thesis.lifecycle_state,
      correlation_tags: thesis.correlation_tags,
      position: thesis.position,
    })),
    correlation_exposure: Object.entries(correlationExposure)
      .map(([tag, maximum_open_loss]) => ({ tag, maximum_open_loss }))
      .sort((left, right) => right.maximum_open_loss - left.maximum_open_loss || left.tag.localeCompare(right.tag)),
    review_queue: reviewQueue,
    learning: learningRecords,
  };
}
