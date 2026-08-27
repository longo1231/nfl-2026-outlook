const round = (value, digits = 6) => value === null ? null : Number(value.toFixed(digits));
const asNumber = value => value === null || value === undefined || value === '' ? null : Number(value);
const clamp = value => Math.max(0, Math.min(1, value));

export function ceilToIncrement(value, increment) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Fee value must be nonnegative and finite');
  if (!Number.isFinite(increment) || increment <= 0) throw new RangeError('Fee increment must be positive and finite');
  return round(Math.ceil((value - 1e-12) / increment) * increment, 10);
}

export function kalshiQuadraticFee({ contracts, price, rate, multiplier, increment = 0.0001 }) {
  if (!Number.isFinite(contracts) || contracts < 0) throw new RangeError('Contract count must be nonnegative and finite');
  if (!Number.isFinite(price) || price < 0 || price > 1) throw new RangeError('Contract price must be between zero and one');
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(multiplier) || multiplier < 0) throw new RangeError('Fee parameters must be nonnegative and finite');
  return ceilToIncrement(multiplier * rate * contracts * price * (1 - price), increment);
}

function normalizeLevels(levels, label) {
  if (!Array.isArray(levels)) throw new TypeError(`${label} order-book levels must be an array`);
  const normalized = levels.map((level, index) => {
    if (!Array.isArray(level) || level.length < 2) throw new TypeError(`${label} level ${index} must contain price and quantity`);
    const price = asNumber(level[0]);
    const contracts = asNumber(level[1]);
    if (!Number.isFinite(price) || price < 0 || price > 1) throw new RangeError(`${label} level ${index} has an invalid price`);
    if (!Number.isFinite(contracts) || contracts <= 0) throw new RangeError(`${label} level ${index} has an invalid quantity`);
    return { price: round(price, 4), contracts: round(contracts, 2) };
  });
  return normalized.toSorted((left, right) => right.price - left.price || right.contracts - left.contracts);
}

const fallbackPrice = (market, key) => {
  const value = asNumber(market?.[key]);
  return Number.isFinite(value) ? value : null;
};

const fallbackSize = (market, key) => {
  const value = asNumber(market?.[key]);
  return Number.isFinite(value) ? value : null;
};

export function normalizeKalshiOrderbook(payload, market = {}) {
  const book = payload?.orderbook_fp ?? payload ?? {};
  const yesBids = normalizeLevels(book.yes_dollars ?? [], 'YES');
  const noBids = normalizeLevels(book.no_dollars ?? [], 'NO');
  const yesAsks = noBids.map(level => ({ price: round(1 - level.price, 4), contracts: level.contracts })).toSorted((left, right) => left.price - right.price);
  const noAsks = yesBids.map(level => ({ price: round(1 - level.price, 4), contracts: level.contracts })).toSorted((left, right) => left.price - right.price);

  const quote = (side, bids, asks) => {
    const prefix = side === 'yes' ? 'yes' : 'no';
    const bid = bids[0]?.price ?? fallbackPrice(market, `${prefix}_bid_dollars`);
    const ask = asks[0]?.price ?? fallbackPrice(market, `${prefix}_ask_dollars`);
    const bidSize = bids[0]?.contracts ?? fallbackSize(market, `${prefix}_bid_size_fp`);
    const askSize = asks[0]?.contracts ?? fallbackSize(market, `${prefix}_ask_size_fp`);
    return {
      side,
      bid: round(bid, 4),
      ask: round(ask, 4),
      bid_size: round(bidSize, 2),
      ask_size: round(askSize, 2),
      spread: bid === null || ask === null ? null : round(ask - bid, 4),
      executable_asks: asks,
    };
  };

  return {
    yes_bids: yesBids,
    no_bids: noBids,
    yes: quote('yes', yesBids, yesAsks),
    no: quote('no', noBids, noAsks),
  };
}

export function calculateKalshiBuyExecution({ asks, requestedContracts, feeSchedule, roundingReserveDollars = 0.01 }) {
  if (!Number.isFinite(requestedContracts) || requestedContracts <= 0) throw new RangeError('Requested contracts must be positive and finite');
  const ordered = [...asks].toSorted((left, right) => left.price - right.price);
  const fills = [];
  let remaining = requestedContracts;
  for (const level of ordered) {
    if (remaining <= 1e-9) break;
    const count = Math.min(remaining, level.contracts);
    if (count <= 0) continue;
    const fee = kalshiQuadraticFee({
      contracts: count,
      price: level.price,
      rate: feeSchedule.taker.rate,
      multiplier: feeSchedule.taker.multiplier,
      increment: feeSchedule.rounding.trade_fee_increment_dollars,
    });
    fills.push({ price: level.price, contracts: round(count, 2), position_cost: round(level.price * count, 6), formula_fee: fee });
    remaining -= count;
  }
  const filled = fills.reduce((sum, fill) => sum + fill.contracts, 0);
  const positionCost = fills.reduce((sum, fill) => sum + fill.position_cost, 0);
  const formulaFee = fills.reduce((sum, fill) => sum + fill.formula_fee, 0);
  const reserve = filled > 0 ? roundingReserveDollars : 0;
  const allInCost = positionCost + formulaFee + reserve;
  return {
    requested_contracts: requestedContracts,
    filled_contracts: round(filled, 2),
    unfilled_contracts: round(Math.max(0, requestedContracts - filled), 2),
    full_fill: Math.abs(filled - requestedContracts) < 1e-9,
    levels_consumed: fills.length,
    fills,
    volume_weighted_price: filled > 0 ? round(positionCost / filled, 6) : null,
    worst_price: fills.at(-1)?.price ?? null,
    position_cost: round(positionCost, 6),
    formula_fee_estimate: round(formulaFee, 6),
    conservative_rounding_reserve: round(reserve, 6),
    conservative_total_fee: round(formulaFee + reserve, 6),
    conservative_all_in_cost: round(allInCost, 6),
    conservative_break_even_probability: filled > 0 ? round(allInCost / filled, 6) : null,
    maximum_payout: round(filled, 2),
    maximum_profit: filled > 0 ? round(filled - allInCost, 6) : null,
  };
}

export function forecastTailProbability(winProbabilityMass, winsAtLeast) {
  if (!Array.isArray(winProbabilityMass) || winProbabilityMass.length !== 18) throw new TypeError('Forecast mass must contain probabilities for zero through 17 wins');
  if (!Number.isInteger(winsAtLeast) || winsAtLeast < 1 || winsAtLeast > 17) throw new RangeError('Win threshold must be an integer from 1 through 17');
  return clamp(winProbabilityMass.slice(winsAtLeast).reduce((sum, probability) => sum + probability, 0));
}

export function quoteMovement(current, previous) {
  if (!previous) return { prior_quote_id: null, bid_change: null, ask_change: null, spread_change: null, ask_size_change: null };
  const difference = (left, right, digits = 4) => left === null || right === null ? null : round(left - right, digits);
  return {
    prior_quote_id: previous.quote_id,
    bid_change: difference(current.bid, previous.bid),
    ask_change: difference(current.ask, previous.ask),
    spread_change: difference(current.spread, previous.spread),
    ask_size_change: difference(current.ask_size, previous.ask_size, 2),
  };
}

export function buildKalshiDiagnostic({
  snapshotId,
  quote,
  teamId,
  winsAtLeast,
  forecast,
  execution,
  policy,
  capturedAt,
  priorDiagnostic = null,
  priorCapturedAt = null,
}) {
  const modelTail = forecastTailProbability(forecast.win_probability_mass, winsAtLeast);
  const fairProbability = quote.side === 'yes' ? modelTail : 1 - modelTail;
  const breakEven = execution.conservative_break_even_probability;
  const grossEdge = execution.volume_weighted_price === null ? null : fairProbability - execution.volume_weighted_price;
  const netEdge = breakEven === null ? null : fairProbability - breakEven;
  const researchGates = {
    full_reference_size: execution.full_fill,
    maximum_spread: quote.spread !== null && quote.spread * 100 <= policy.research_diagnostic.maximum_spread_cents,
    minimum_net_edge: netEdge !== null && netEdge * 100 >= policy.research_diagnostic.minimum_net_edge_cents,
  };
  const researchQualified = Object.values(researchGates).every(Boolean);
  const spacingSeconds = priorCapturedAt ? (new Date(capturedAt) - new Date(priorCapturedAt)) / 1000 : null;
  const priorSpacingValid = spacingSeconds !== null
    && spacingSeconds >= policy.persistence.minimum_spacing_seconds
    && spacingSeconds <= policy.persistence.maximum_spacing_seconds;
  const persistenceCount = researchQualified
    ? priorDiagnostic?.research_qualified && priorSpacingValid
      ? priorDiagnostic.persistence.qualifying_captures + 1
      : 1
    : 0;
  const actionGates = {
    research_qualified: researchQualified,
    forecast_validated: forecast.model_state === 'validated' && forecast.decision_eligible === true,
    quote_fresh_at_capture: true,
    fee_schedule_versioned: Boolean(policy.fee_schedule_id),
    persistence: persistenceCount >= policy.persistence.minimum_qualifying_captures,
  };
  const failedGates = Object.entries(actionGates).filter(([, pass]) => !pass).map(([gate]) => gate);
  return {
    comparison_id: `cmp-${snapshotId}-${quote.contract_id}-${quote.side}`,
    comparison_type: 'model_market_candidate',
    input_quote_ids: [quote.quote_id],
    quote_id: quote.quote_id,
    forecast_version_id: forecast.forecast_version_id,
    team_id: teamId,
    contract_id: quote.contract_id,
    side: quote.side,
    wins_at_least: winsAtLeast,
    requested_contracts: execution.requested_contracts,
    model_fair_probability: round(fairProbability),
    executable_price: execution.volume_weighted_price,
    conservative_break_even_probability: breakEven,
    gross_edge: round(grossEdge),
    net_edge: round(netEdge),
    spread: quote.spread,
    execution,
    research_gates: researchGates,
    research_qualified: researchQualified,
    persistence: {
      qualifying_captures: persistenceCount,
      required_captures: policy.persistence.minimum_qualifying_captures,
      prior_comparison_id: priorDiagnostic?.comparison_id ?? null,
      spacing_seconds: spacingSeconds === null ? null : round(spacingSeconds, 3),
      spacing_valid: priorSpacingValid,
    },
    action_gates: actionGates,
    failed_gates: failedGates,
    action_eligible: Object.values(actionGates).every(Boolean),
    eligibility: Object.values(actionGates).every(Boolean),
    generated_at: capturedAt,
  };
}
