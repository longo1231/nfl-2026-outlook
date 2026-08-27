const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const logit = probability => Math.log(clamp(probability, 1e-9, 1 - 1e-9) / (1 - clamp(probability, 1e-9, 1 - 1e-9)));
const logistic = value => 1 / (1 + Math.exp(-value));

export function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function invertMatrix(matrix) {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) => rowIndex === columnIndex ? 1 : 0),
  ]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[pivotRow][pivot])) pivotRow = row;
    }
    if (Math.abs(augmented[pivotRow][pivot]) < 1e-12) throw new Error('Forecast information matrix is singular');
    [augmented[pivot], augmented[pivotRow]] = [augmented[pivotRow], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = 0; column < size * 2; column += 1) augmented[pivot][column] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      if (factor === 0) continue;
      for (let column = 0; column < size * 2; column += 1) augmented[row][column] -= factor * augmented[pivot][column];
    }
  }
  return augmented.map(row => row.slice(size));
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

export function fitTeamStrength(games, teamIds, targetSeason, parameters) {
  const trainingGames = games.filter(game => game.season >= parameters.training_start_season && game.season < targetSeason);
  if (trainingGames.length === 0) throw new Error(`No training games exist before ${targetSeason}`);
  const orderedTeams = [...teamIds].sort();
  const teamIndex = new Map(orderedTeams.map((team, index) => [team, index]));
  const homeFieldIndex = orderedTeams.length;
  const size = orderedTeams.length + 1;
  const information = Array.from({ length: size }, () => Array(size).fill(0));
  const response = Array(size).fill(0);
  let weightSum = 0;

  const designFor = game => {
    const design = Array(size).fill(0);
    const homeIndex = teamIndex.get(game.home_team);
    const awayIndex = teamIndex.get(game.away_team);
    if (homeIndex === undefined || awayIndex === undefined) throw new Error(`Unknown team in ${game.game_id}`);
    design[homeIndex] = 1;
    design[awayIndex] = -1;
    design[homeFieldIndex] = game.location === 'neutral' ? 0 : 1;
    return design;
  };

  for (const game of trainingGames) {
    const design = designFor(game);
    const seasonsAgo = targetSeason - game.season;
    const weight = 0.5 ** (seasonsAgo / parameters.recency_half_life_seasons);
    const margin = clamp(game.home_score - game.away_score, -parameters.margin_cap_points, parameters.margin_cap_points);
    weightSum += weight;
    for (let row = 0; row < size; row += 1) {
      if (design[row] === 0) continue;
      response[row] += weight * design[row] * margin;
      for (let column = 0; column < size; column += 1) {
        if (design[column] !== 0) information[row][column] += weight * design[row] * design[column];
      }
    }
  }
  for (let index = 0; index < orderedTeams.length; index += 1) information[index][index] += parameters.ridge_penalty;
  information[homeFieldIndex][homeFieldIndex] += parameters.home_field_ridge_penalty;

  const inverse = invertMatrix(information);
  const coefficients = multiplyMatrixVector(inverse, response);
  const strengthMean = mean(coefficients.slice(0, orderedTeams.length));
  const strengths = Object.fromEntries(orderedTeams.map((team, index) => [team, coefficients[index] - strengthMean]));
  const homeFieldPoints = coefficients[homeFieldIndex];
  let weightedSquaredError = 0;
  let weightedTies = 0;
  for (const game of trainingGames) {
    const observed = clamp(game.home_score - game.away_score, -parameters.margin_cap_points, parameters.margin_cap_points);
    const predicted = strengths[game.home_team] - strengths[game.away_team] + (game.location === 'neutral' ? 0 : homeFieldPoints);
    const weight = 0.5 ** ((targetSeason - game.season) / parameters.recency_half_life_seasons);
    weightedSquaredError += weight * (observed - predicted) ** 2;
    if (game.home_score === game.away_score) weightedTies += weight;
  }
  const residualSdPoints = Math.sqrt(weightedSquaredError / Math.max(1, weightSum - size));
  const coefficientSd = Object.fromEntries(orderedTeams.map((team, index) => [team, Math.sqrt(Math.max(0, residualSdPoints ** 2 * inverse[index][index]))]));

  return {
    target_season: targetSeason,
    team_ids: orderedTeams,
    strengths,
    coefficient_sd_points: coefficientSd,
    home_field_points: homeFieldPoints,
    residual_sd_points: residualSdPoints,
    tie_probability: weightedTies / weightSum,
    training_game_count: trainingGames.length,
    effective_training_weight: weightSum,
    parameters: {
      recency_half_life_seasons: parameters.recency_half_life_seasons,
      ridge_penalty: parameters.ridge_penalty,
      margin_cap_points: parameters.margin_cap_points,
      home_field_ridge_penalty: parameters.home_field_ridge_penalty,
      training_start_season: parameters.training_start_season,
    },
  };
}

export function gameProbabilities(game, homeStrength, awayStrength, homeFieldPoints, residualSdPoints, tieProbability = 0) {
  const expectedHomeMargin = homeStrength - awayStrength + (game.location === 'neutral' ? 0 : homeFieldPoints);
  const conditionalHomeWin = normalCdf(expectedHomeMargin / residualSdPoints);
  const tie = clamp(tieProbability, 0, 1);
  return { home_win: (1 - tie) * conditionalHomeWin, away_win: (1 - tie) * (1 - conditionalHomeWin), tie, expected_home_margin: expectedHomeMargin };
}

export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const normalSampler = rng => {
  let spare = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const first = Math.max(rng(), Number.EPSILON);
    const second = rng();
    const radius = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
};

const discreteQuantile = (mass, probability) => {
  let cumulative = 0;
  for (let wins = 0; wins < mass.length; wins += 1) {
    cumulative += mass[wins];
    if (cumulative + 1e-12 >= probability) return wins;
  }
  return mass.length - 1;
};

export function simulateSchedule({ schedule, fit, adjustments, draws, seed, intervalProbability, offseasonDriftSdPoints, missingContextSdPoints = 0 }) {
  if (!Number.isInteger(draws) || draws < 1) throw new Error('Simulation draws must be a positive integer');
  const teams = fit.team_ids;
  const teamIndex = new Map(teams.map((team, index) => [team, index]));
  const adjustmentByTeam = new Map(adjustments.teams.map(team => [team.team_id, team]));
  const strengthMeans = teams.map(team => {
    const adjustment = adjustmentByTeam.get(team);
    if (!adjustment) throw new Error(`Missing adjustment row for ${team}`);
    return fit.strengths[team] + adjustment.quarterback_points + adjustment.availability_points;
  });
  const strengthSds = teams.map(team => Math.sqrt(
    fit.coefficient_sd_points[team] ** 2
    + offseasonDriftSdPoints ** 2
    + (adjustments.coverage_complete ? 0 : missingContextSdPoints ** 2),
  ));
  const indexedSchedule = schedule.map(game => ({
    ...game,
    home_index: teamIndex.get(game.home_team),
    away_index: teamIndex.get(game.away_team),
  }));
  if (indexedSchedule.some(game => game.home_index === undefined || game.away_index === undefined)) throw new Error('Schedule contains an unknown team');
  const winCounts = teams.map(() => Array(18).fill(0));
  let totalWins = 0;
  let totalTies = 0;
  const rng = createRng(seed);
  const sampleNormal = normalSampler(rng);
  const latent = Array(teams.length).fill(0);
  const wins = new Uint8Array(teams.length);

  for (let draw = 0; draw < draws; draw += 1) {
    wins.fill(0);
    for (let team = 0; team < teams.length; team += 1) latent[team] = strengthMeans[team] + strengthSds[team] * sampleNormal();
    for (const game of indexedSchedule) {
      const probabilities = gameProbabilities(
        game,
        latent[game.home_index],
        latent[game.away_index],
        fit.home_field_points,
        fit.residual_sd_points,
        fit.tie_probability,
      );
      const outcome = rng();
      if (outcome < probabilities.home_win) {
        wins[game.home_index] += 1;
        totalWins += 1;
      } else if (outcome < probabilities.home_win + probabilities.away_win) {
        wins[game.away_index] += 1;
        totalWins += 1;
      } else {
        totalTies += 1;
      }
    }
    for (let team = 0; team < teams.length; team += 1) winCounts[team][wins[team]] += 1;
  }

  const tail = (1 - intervalProbability) / 2;
  const teamResults = teams.map((team, index) => {
    const mass = winCounts[index].map(count => count / draws);
    const expectedWins = mass.reduce((sum, probability, winsValue) => sum + probability * winsValue, 0);
    return {
      team_id: team,
      strength_mean_points: strengthMeans[index],
      strength_sd_points: strengthSds[index],
      win_probability_mass: mass,
      expected_wins: expectedWins,
      median_wins: discreteQuantile(mass, 0.5),
      interval_80: [discreteQuantile(mass, tail), discreteQuantile(mass, 1 - tail)],
    };
  });
  const expectedTeamWins = teamResults.reduce((sum, team) => sum + team.expected_wins, 0);
  const expectedTies = totalTies / draws;
  return {
    teams: teamResults,
    summary: {
      schedule_games: schedule.length,
      draws,
      expected_team_wins: expectedTeamWins,
      expected_tied_games: expectedTies,
      coherence_error: Math.abs(schedule.length - expectedTeamWins - expectedTies),
      simulated_total_wins: totalWins,
      simulated_total_ties: totalTies,
    },
  };
}

export function predictGames(games, fit) {
  return games.map(game => ({
    game_id: game.game_id,
    season: game.season,
    ...gameProbabilities(game, fit.strengths[game.home_team], fit.strengths[game.away_team], fit.home_field_points, fit.residual_sd_points, fit.tie_probability),
  }));
}

const predictionRows = (games, predictions) => {
  const predictionByGame = new Map(predictions.map(prediction => [prediction.game_id, prediction]));
  return games.flatMap(game => {
    const prediction = predictionByGame.get(game.game_id);
    if (!prediction) throw new Error(`Missing prediction for ${game.game_id}`);
    return [
      { probability: prediction.home_win, outcome: game.home_score > game.away_score ? 1 : 0 },
      { probability: prediction.away_win, outcome: game.away_score > game.home_score ? 1 : 0 },
    ];
  });
};

export function scorePredictionRows(rows) {
  const bins = Array.from({ length: 10 }, (_, index) => ({ lower: index / 10, upper: (index + 1) / 10, count: 0, probability_sum: 0, outcome_sum: 0 }));
  let squaredError = 0;
  let logarithmicLoss = 0;
  for (const row of rows) {
    const probability = clamp(row.probability, 1e-9, 1 - 1e-9);
    squaredError += (probability - row.outcome) ** 2;
    logarithmicLoss -= row.outcome * Math.log(probability) + (1 - row.outcome) * Math.log(1 - probability);
    const bin = bins[Math.min(9, Math.floor(probability * 10))];
    bin.count += 1;
    bin.probability_sum += row.probability;
    bin.outcome_sum += row.outcome;
  }
  const reliability = bins.map(bin => ({
    lower: bin.lower,
    upper: bin.upper,
    count: bin.count,
    mean_probability: bin.count === 0 ? null : bin.probability_sum / bin.count,
    observed_rate: bin.count === 0 ? null : bin.outcome_sum / bin.count,
  }));
  const expectedCalibrationError = reliability.reduce((sum, bin) => bin.count === 0
    ? sum
    : sum + bin.count / rows.length * Math.abs(bin.mean_probability - bin.observed_rate), 0);
  return {
    observations: rows.length,
    brier_score: squaredError / rows.length,
    log_loss: logarithmicLoss / rows.length,
    expected_calibration_error: expectedCalibrationError,
    reliability,
  };
}

export function scoreGamePredictions(games, predictions) {
  return scorePredictionRows(predictionRows(games, predictions));
}

export function leagueBaselinePredictions(trainingGames, targetGames) {
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;
  for (const game of trainingGames) {
    if (game.home_score > game.away_score) homeWins += 1;
    else if (game.away_score > game.home_score) awayWins += 1;
    else ties += 1;
  }
  const total = homeWins + awayWins + ties;
  return targetGames.map(game => ({ game_id: game.game_id, season: game.season, home_win: homeWins / total, away_win: awayWins / total, tie: ties / total }));
}

export function priorRecordBaselinePredictions(trainingGames, targetGames, targetSeason, pseudoGames = 8) {
  const priorSeasonGames = trainingGames.filter(game => game.season === targetSeason - 1);
  const records = new Map();
  const ensure = team => {
    if (!records.has(team)) records.set(team, { wins: 0, games: 0 });
    return records.get(team);
  };
  let trainingTeamWins = 0;
  for (const game of trainingGames) {
    trainingTeamWins += game.home_score === game.away_score ? 0 : 1;
  }
  const leagueTeamWinRate = trainingTeamWins / (trainingGames.length * 2);
  let nonTieHomeWins = 0;
  let nonTieAwayWins = 0;
  let ties = 0;
  for (const game of trainingGames) {
    if (game.home_score > game.away_score) nonTieHomeWins += 1;
    else if (game.away_score > game.home_score) nonTieAwayWins += 1;
    else ties += 1;
  }
  for (const game of priorSeasonGames) {
    const home = ensure(game.home_team);
    const away = ensure(game.away_team);
    home.games += 1;
    away.games += 1;
    if (game.home_score > game.away_score) home.wins += 1;
    if (game.away_score > game.home_score) away.wins += 1;
  }
  const tieRate = ties / trainingGames.length;
  const homeAdvantage = logit(nonTieHomeWins / (nonTieHomeWins + nonTieAwayWins));
  const rating = team => {
    const record = records.get(team) ?? { wins: 0, games: 0 };
    return logit((record.wins + pseudoGames * leagueTeamWinRate) / (record.games + pseudoGames));
  };
  return targetGames.map(game => {
    const homeShare = logistic(rating(game.home_team) - rating(game.away_team) + (game.location === 'neutral' ? 0 : homeAdvantage));
    return { game_id: game.game_id, season: game.season, home_win: (1 - tieRate) * homeShare, away_win: (1 - tieRate) * (1 - homeShare), tie: tieRate };
  });
}

const americanImplied = odds => odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);

export function marketBaselinePredictions(targetGames, benchmarkGames, tieRate) {
  const benchmarkByGame = new Map(benchmarkGames.map(game => [game.game_id, game]));
  return targetGames.map(game => {
    const quote = benchmarkByGame.get(game.game_id);
    if (!quote) throw new Error(`Missing market benchmark for ${game.game_id}`);
    const rawAway = americanImplied(quote.away_moneyline);
    const rawHome = americanImplied(quote.home_moneyline);
    const total = rawAway + rawHome;
    return {
      game_id: game.game_id,
      season: game.season,
      home_win: (1 - tieRate) * rawHome / total,
      away_win: (1 - tieRate) * rawAway / total,
      tie: tieRate,
    };
  });
}

function averageRanks(values) {
  const order = values.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value);
  const ranks = Array(values.length);
  for (let start = 0; start < order.length;) {
    let end = start + 1;
    while (end < order.length && order[end].value === order[start].value) end += 1;
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) ranks[order[index].index] = rank;
    start = end;
  }
  return ranks;
}

export function spearmanCorrelation(left, right) {
  if (left.length !== right.length || left.length < 2) throw new Error('Spearman inputs must have the same length >= 2');
  const leftRanks = averageRanks(left);
  const rightRanks = averageRanks(right);
  const leftMean = mean(leftRanks);
  const rightMean = mean(rightRanks);
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDifference = leftRanks[index] - leftMean;
    const rightDifference = rightRanks[index] - rightMean;
    covariance += leftDifference * rightDifference;
    leftVariance += leftDifference ** 2;
    rightVariance += rightDifference ** 2;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

export function actualSeasonWins(games, teamIds) {
  const wins = Object.fromEntries(teamIds.map(team => [team, 0]));
  for (const game of games) {
    if (game.home_score > game.away_score) wins[game.home_team] += 1;
    if (game.away_score > game.home_score) wins[game.away_team] += 1;
  }
  return wins;
}

export function validateForecastDistributions(forecast, tolerance = 1e-9) {
  if (forecast.teams.length !== 32) throw new Error('Forecast must contain 32 teams');
  const teamIds = new Set();
  let maximumMassError = 0;
  let maximumExpectedWinsError = 0;
  for (const team of forecast.teams) {
    if (teamIds.has(team.team_id)) throw new Error(`Forecast contains duplicate team ${team.team_id}`);
    teamIds.add(team.team_id);
    if (team.win_probability_mass.length !== 18) throw new Error(`${team.team_id} forecast must contain 18 exact-win probabilities`);
    if (team.win_probability_mass.some(value => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error(`${team.team_id} forecast contains invalid probability mass`);
    const massSum = team.win_probability_mass.reduce((sum, value) => sum + value, 0);
    const expectedWins = team.win_probability_mass.reduce((sum, value, wins) => sum + wins * value, 0);
    maximumMassError = Math.max(maximumMassError, Math.abs(1 - massSum));
    maximumExpectedWinsError = Math.max(maximumExpectedWinsError, Math.abs(team.expected_wins - expectedWins));
    if (team.interval_80.length !== 2 || team.interval_80[0] > team.interval_80[1]) throw new Error(`${team.team_id} interval is invalid`);
  }
  if (maximumMassError > tolerance) throw new Error(`Forecast probability mass error ${maximumMassError} exceeds ${tolerance}`);
  if (maximumExpectedWinsError > tolerance) throw new Error(`Forecast expected-win error ${maximumExpectedWinsError} exceeds ${tolerance}`);
  return { team_count: teamIds.size, maximum_mass_error: maximumMassError, maximum_expected_wins_error: maximumExpectedWinsError };
}
