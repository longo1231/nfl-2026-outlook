# 2026 NFL preseason forecast — Phase 3 preregistration

Status: locked before the first Phase 3 holdout evaluation on 2026-08-27; structural tie amendment recorded at 2026-08-27T14:54:14Z
Model: `schedule-sim-v1`
Target: exact regular-season wins, 0–17, for all 32 teams

## Decision boundary

This model is independent of the Field Guide's editorial rankings and current sportsbook or exchange prices. It may be shown beside those layers, but none of them is a fitting feature.

The first version answers only:

- the probability of exactly 0 through 17 wins;
- expected and median wins;
- a central 80% predictive interval;
- game-level home, away and tie probabilities used by the schedule simulation.

It does not produce playoff, conference or Super Bowl probabilities. Those require tested tiebreaker and postseason logic that is outside Phase 3.

## Data and time split

The canonical source is the nflverse `nfldata` games/schedules file pinned to an immutable source commit. The raw source is snapshotted and hashed before normalization.

- Historical fit pool: 2010–2025 completed regular-season games.
- Hyperparameter tuning seasons: 2018–2021.
- Untouched holdout seasons: 2022–2025.
- Production target: the official 272-game 2026 regular-season schedule.
- Historical results used for fitting contain only game identity, date, venue designation, teams and final scores.
- Historical moneylines are normalized into a separate evaluation-only file. The model-fitting code does not accept that file.
- Team aliases follow franchise continuity: `OAK → LV`, `SD → LAC`, and `LA/STL → LAR`.

The canceled Buffalo–Cincinnati game leaves 271 completed regular-season games in 2022. It is not imputed. Validation uses the games actually played and each team's actual number of decisions.

## Model

For every target season, fit a recency-weighted ridge regression to capped home scoring margin:

```text
capped home margin = home-field coefficient + home team strength - away team strength + error
```

- Neutral-site games receive no home-field term.
- Ridge shrinkage pulls every team toward league average.
- Recency weights decay by season and use only games before the target season.
- The residual scale converts expected margins into the conditional home/away split with a normal latent-margin approximation. A recency-weighted empirical tie rate is reserved first because a continuous half-point band materially overstates NFL ties.
- Posterior coefficient uncertainty comes from the regularized information matrix.
- A fixed offseason-drift term is added in quadrature so a preseason simulation does not pretend last year's fitted strength is known exactly.
- Versioned quarterback and availability adjustments are additive in point units. Phase 3 starts with explicit zero placeholders and a blocking coverage warning; no adjustment is guessed.

Within each season draw, one latent strength is sampled for every team and held across its full schedule. Each game then produces exactly one home win, away win or tie. This carries team-level uncertainty across games and preserves schedule coherence.

## Hyperparameter selection

The grid is fixed before holdout scoring:

- recency half-life in seasons: `1.5`, `2.5`, `4.0`;
- team ridge penalty: `4`, `12`, `36`;
- score-margin cap in points: `21`, `28`.

Select the combination with the lowest mean team-perspective binary win Brier score across 2018–2021. Ties are non-wins for both teams because the forecast target is wins, not standings points. Break exact ties by lower log loss, then the order above. The selected combination is frozen before 2022–2025 is evaluated.

## Validation

Report separately for the model, a league home/tie-rate baseline, a shrunk prior-season-record baseline and an evaluation-only de-vigged historical moneyline benchmark:

- team-perspective win Brier score;
- binary log loss;
- 10-bin reliability table and expected calibration error;
- central 80% season-win interval coverage;
- season-level Spearman rank correlation between expected and actual wins.

The moneyline benchmark is context, not a feature and not a required profitability hurdle.

Promotion from `provisional` to `validated` requires all of:

1. deterministic replay and all distribution/coherence gates pass;
2. four untouched holdout seasons are present;
3. Brier score improves at least 1% over the league baseline and is no worse than the prior-season-record baseline;
4. log loss is no worse than the prior-season-record baseline;
5. expected calibration error is at most 0.04;
6. central 80% interval coverage is between 0.72 and 0.88;
7. sourced current quarterback/availability coverage is complete for all 32 teams.

Failing a promotion gate does not erase the model. A structurally valid version remains a labeled provisional research forecast and cannot create an automated action label.

## Fixed simulation settings

- Production draws: 100,000.
- Validation draws per season: 25,000.
- Production seed: 20,260,827.
- Central interval: 80%.
- Offseason drift standard deviation: 3.0 points.
- Missing-current-context standard deviation: 1.5 points while sourced adjustments are incomplete.

## Structural amendment log

The first generated prototype used the preregistered half-point latent tie band. It produced 8.083 expected tied games in the 272-game 2026 schedule, while the 2010–2025 source contains 13 ties in 4,175 completed regular-season games. That prototype was rejected before public-manifest or UI integration.

At 2026-08-27T14:54:14Z, `schedule-sim-v1.0.1` replaced only the tie mechanism with the recency-weighted empirical training rate. Strength fitting, the hyperparameter grid, time split, simulation draws and every promotion threshold remain unchanged. This is a structural correction motivated by an implausible invariant, not a holdout-score optimization.

## Known limitations

- A score-margin ridge model is deliberately simple and can miss quarterback changes, roster discontinuities, coaching changes and nonlinear matchup effects.
- Independent team shocks do not encode a full league covariance matrix.
- The normal latent-margin approximation is not a literal score model.
- The historical moneyline fields are an evaluation benchmark whose exact venue/timing provenance is not strong enough to call a closing-line source of truth.
- The first forecast is preseason-only; it has no weekly update rule yet.
