'use client';

import { useEffect, useMemo, useState } from 'react';
import { distributionMoments, normalizeCategoryWeights, probabilityAtLeast, probabilityAtMost, rankScores } from '../../lib/profile-market.mjs';
import { betCandidates, CategoryId, claimCount, defaultAnalysisWeights, defaultProfileRanks, evidenceByCategory, kalshiMarketSource, marketAudit, markets, marketSource, previewEvidenceByTeam, previewSources, profileRanksFor, profileScoreFor, scoredCategories as categories, sourceMeta, sourceRegistry, sportsbookMarketAudit, teams, winAggregates, type Evidence, type Market, type PreviewEvidence, type PreviewSource, type Team } from './data';

type TabId = string;
const tabs: {id:TabId; label:string}[] = [
  {id:'briefing',label:'Briefing'}, {id:'matrix',label:'League matrix'}, {id:'teams',label:'Team profiles'},
  ...categories.map(category=>({id:category.id,label:category.label})),
  {id:'previews',label:'Team previews'}, {id:'markets',label:'Win markets'}, {id:'analysis',label:'Analysis vs market'}, {id:'synthesis',label:'Synthesis'}, {id:'sources',label:'Sources & QA'},
];
const teamByAbbr = Object.fromEntries(teams.map(t => [t.abbr,t]));
const categoryById = Object.fromEntries(categories.map(c => [c.id,c]));
const categoryIds = new Set(categories.map(category=>category.id));
const previewTeamCount = new Set(previewSources.flatMap(source=>source.coveredTeams)).size;
const rankTone = (rank:number) => rank <= 8 ? 'elite' : rank <= 16 ? 'good' : rank <= 24 ? 'warn' : 'poor';
const marketOrder = Object.fromEntries(teams.map(team => [team.abbr,markets[team.abbr].marketRank]));
const percent = (value:number) => `${(value*100).toFixed(1)}%`;
const wins = (value:number) => value.toFixed(1);

function SectionIntro({kicker,title,copy}:{kicker:string;title:string;copy:string}) {
  return <div className="sectionIntro"><div><div className="eyebrow">{kicker}</div><h2>{title}</h2></div><p>{copy}</p></div>;
}

function RankPill({rank}:{rank:number}) { return <span className={`rankPill ${rankTone(rank)}`}>#{rank}</span>; }

function EvidenceBody({entry,category}:{entry:Evidence;category:CategoryId}) {
  const meta = sourceMeta[category];
  return <div className="evidenceBody">
    <div className="peopleLine"><span>People named</span><div>{entry.people.length ? entry.people.map(p=><i key={p}>{p}</i>) : <em>No individual emphasized</em>}</div></div>
    <div className="evidenceGrid">
      <div><h4>Case for</h4>{entry.positives.length ? <ul>{entry.positives.map(x=><li key={x}>{x}</li>)}</ul> : <p className="empty">No substantive positive case offered.</p>}</div>
      <div><h4>Risks & limits</h4>{entry.concerns.length ? <ul>{entry.concerns.map(x=><li key={x}>{x}</li>)}</ul> : <p className="empty">No separate concern recorded.</p>}</div>
    </div>
    {entry.context.length > 0 && <div className="sourceNote"><strong>Context</strong>{entry.context.map(x=><span key={x}>{x}</span>)}</div>}
    <a className="sourceLink" href={meta.source} target="_blank" rel="noreferrer">Publisher transcript · source lines {entry.lines[0]}–{entry.lines[1]} ↗</a>
  </div>;
}

function PreviewEvidenceBody({source,entry}:{source:PreviewSource;entry:PreviewEvidence}) {
  return <div className="previewEvidenceBody">
    <div className="previewFlags"><span>Scoped preview</span><span>Market-aware</span><span>Weight 0</span></div>
    <div className="evidenceGrid">
      <div><h4>Case for</h4>{entry.positives.length ? <ul>{entry.positives.map(point=><li key={point}>{point}</li>)}</ul> : <p className="empty">No substantive positive case offered.</p>}</div>
      <div><h4>Risks & limits</h4>{entry.concerns.length ? <ul>{entry.concerns.map(point=><li key={point}>{point}</li>)}</ul> : <p className="empty">No separate concern recorded.</p>}</div>
    </div>
    <div className="sourceNote"><strong>Source-stated context</strong>{entry.context.map(point=><span key={point}>{point}</span>)}</div>
    <a className="sourceLink" href={source.source.url} target="_blank" rel="noreferrer">Open {source.source.format} ↗</a>
  </div>;
}

function WinDensity({market,teamName}:{market:Market;teamName:string}) {
  const peak = Math.max(...market.distribution.map(point=>point.probability));
  const expectedPosition = ((market.expectedWins+0.5)/18)*100;
  return <article className="winDensity">
    <header><div><span>Kalshi win distribution</span><h3>{teamName}: every regular-season outcome</h3><p>Exact-win density derived from the complete monotone midpoint tail curve.</p></div><div className="densityStats"><span><b>{market.expectedWins.toFixed(2)}</b><small>modeled E[W]</small></span><span><b>{market.modeWins}</b><small>most likely · {percent(market.modeProbability)}</small></span><span><b>#{market.marketRank}</b><small>expected-win rank</small></span></div></header>
    <div className="densityPlot">
      <ol className="densityBars" aria-label={`${teamName} modeled probability for exactly zero through 17 wins`}>
        {market.distribution.map(point=><li key={point.wins} aria-label={`${point.wins} wins: ${percent(point.probability)}`} title={`${point.wins} wins · ${percent(point.probability)}`}><span>{point.probability>=0.075?percent(point.probability):''}</span><i aria-hidden="true" style={{height:`${peak ? point.probability/peak*100 : 0}%`}}/><b>{point.wins}</b></li>)}
        <li className="expectedMarker" aria-hidden="true" style={{left:`${expectedPosition}%`}}><span>E[W] {market.expectedWins.toFixed(2)}</span></li>
      </ol>
      <p>Exact regular-season wins</p>
    </div>
    <footer><span>{market.thresholdCount} / 17 tails · average spread {percent(market.kalshiAverageSpread)}</span><span>Bid/ask tail-sum range {market.expectedWinsBid.toFixed(1)}–{market.expectedWinsAsk.toFixed(1)}</span><span>Derived density—not an exact-win contract quote</span></footer>
  </article>;
}

function Briefing({go}:{go:(tab:TabId)=>void}) {
  const leaders = [...teams].sort((a,b)=>defaultProfileRanks[a.abbr]-defaultProfileRanks[b.abbr]).slice(0,6);
  return <section className="reportShell">
    <SectionIntro kicker="Executive briefing" title="Four scored lenses. Three scoped previews." copy="This is a faithful evidence digest, not a new power ranking. The provisional profile gives QB the most influence, then coaching, line and skill. The NFC East and two-part AFC previews add team context at zero weight because they do not supply a comparable league-wide contract." />
    <div className="heroGrid">
      <article className="leadStory"><div className="eyebrow inverse">The clearest complete offense</div><h3>Los Angeles has the fewest places to hide a weakness.</h3><p>The Rams pair the No. 1 skill group with No. 2 coaching, a top-ten line and the reigning-MVP quarterback at No. 8. Their 11.5-win market is expensive, but the inputs broadly confirm it.</p><button onClick={()=>go('teams')}>Open team profiles</button></article>
      <div className="statStack">
        <div><strong>{categories.length*teams.length}/{categories.length*teams.length}</strong><span>team-category ranks reconciled</span></div>
        <div><strong>{claimCount}</strong><span>substantive evidence points retained</span></div>
        <div><strong>{sourceRegistry.length}</strong><span>sources snapshotted and audited read-only</span></div>
      </div>
    </div>
    <div className="briefCards">
      <article><span>Balanced riser</span><h3>Chicago</h3><p>Ranks 3rd coaching, 7th line, 11th skill and 13th QB. The 9.5 market asks for confirmation, not a miracle.</p></article>
      <article><span>Structural tension</span><h3>Cincinnati</h3><p>Burrow (3) and the skill group (5) collide with coaching (31) and line (20). A 10.5 total is a direct bet on the stars outrunning the structure.</p></article>
      <article><span>Health fragility</span><h3>Chargers</h3><p>A top-four coach and nominal No. 4 line support Herbert, but center and tackle injuries already reduce the live line view to roughly 8th–10th.</p></article>
      <article><span>Aligned teardown</span><h3>Miami</h3><p>Skill ranks 32nd, quarterback 26th, line 26th and coaching 26th. The market agrees at only 3.5 wins.</p></article>
    </div>
    <div className="leaderStrip"><div><div className="eyebrow">Weighted profile leaders</div><p>40% QB · 25% coaching · 20% OL · 15% skill. No defense yet.</p></div>{leaders.map(t=><button key={t.abbr} onClick={()=>go('analysis')}><b>#{defaultProfileRanks[t.abbr]}</b><span>{t.abbr}</span><small>{profileScoreFor(t.abbr).toFixed(1)}</small></button>)}</div>
    <div className="readMe"><strong>How to use this</strong><p>Begin in the matrix for league shape, open a team profile for every supporting point, and use Team previews for the {previewTeamCount} covered clubs. Treat market disagreements as research prompts—not automatic bets.</p></div>
  </section>;
}

function Matrix({openTeam}:{openTeam:(abbr:string)=>void}) {
  const [sort,setSort] = useState<'profile'|CategoryId|'market'>('profile');
  const [conference,setConference] = useState<'All'|'AFC'|'NFC'>('All');
  const [query,setQuery] = useState('');
  const rows = useMemo(()=>teams.filter(t=>(conference==='All'||t.conference===conference) && `${t.name} ${t.abbr}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==='market') return markets[a.abbr].marketRank-markets[b.abbr].marketRank || a.name.localeCompare(b.name);
    if(sort==='profile') return defaultProfileRanks[a.abbr]-defaultProfileRanks[b.abbr];
    return evidenceByCategory[sort][a.abbr].rank-evidenceByCategory[sort][b.abbr].rank;
  }),[sort,conference,query]);
  const matrixStyle = {gridTemplateColumns:`minmax(255px,1.5fr) repeat(${categories.length},minmax(68px,.38fr)) 85px 75px`,minWidth:`${480+categories.length*70}px`};
  return <section className="reportShell">
    <SectionIntro kicker="League matrix" title="Strength, weakness, and the gaps between." copy="Unit ranks are Brandon Anderson’s exact 1–32 order. Profile rank uses the visible provisional importance weights—never an unqualified average—and remains incomplete until defense arrives." />
    <div className="controls"><label>Find a team<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or abbreviation" /></label><label>Order by<select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="profile">Weighted profile rank</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}<option value="market">Kalshi expected-win rank</option></select></label><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="legend"><span><i className="elite"/>1–8</span><span><i className="good"/>9–16</span><span><i className="warn"/>17–24</span><span><i className="poor"/>25–32</span><em>Lower = stronger</em></div>
    <div className="matrixCard full"><div className="matrixHead matrixGrid" style={matrixStyle}><span>Team</span>{categories.map(c=><button onClick={()=>setSort(c.id)} key={c.id}>{c.short}</button>)}<button onClick={()=>setSort('profile')}>Profile</button><button onClick={()=>setSort('market')}>Mkt.</button></div>{rows.map(t=><button className="matrixRow matrixGrid" style={matrixStyle} key={t.abbr} onClick={()=>openTeam(t.abbr)}><div className="teamCell"><span className="teamBadge">{t.abbr}</span><div><strong>{t.name}</strong><small>{t.conference} {t.division}</small></div></div>{categories.map(c=><RankPill key={c.id} rank={evidenceByCategory[c.id][t.abbr].rank}/>) }<strong className="composite">#{defaultProfileRanks[t.abbr]}</strong><span className="marketMini" title={`Kalshi full-ladder expected-win rank; ${markets[t.abbr].expectedWins?.toFixed(2)} modeled wins`}>#{markets[t.abbr].marketRank}</span></button>)}</div>
  </section>;
}

function TeamProfiles({selected,setSelected}:{selected:string;setSelected:(v:string)=>void}) {
  const team = teamByAbbr[selected];
  const entries = categories.map(c=>({category:c,entry:evidenceByCategory[c.id][selected]}));
  const previews = previewEvidenceByTeam[selected];
  const spread = Math.max(...entries.map(x=>x.entry.rank))-Math.min(...entries.map(x=>x.entry.rank));
  return <section className="reportShell">
    <SectionIntro kicker="Team dossier" title="Every retained argument, plus the full market shape." copy="Choose any club to see every available exact unit rank, each supporting point and the complete Kalshi-derived probability density for zero through 17 wins." />
    <div className="teamPicker"><label>Team<select value={selected} onChange={e=>setSelected(e.target.value)}>{[...teams].sort((a,b)=>a.name.localeCompare(b.name)).map(t=><option value={t.abbr} key={t.abbr}>{t.name}</option>)}</select></label><div className="teamIdentity"><span>{team.abbr}</span><div><h3>{team.name}</h3><p>{team.conference} {team.division} · Kalshi E[W] {markets[selected].expectedWins.toFixed(2)} · most likely {markets[selected].modeWins} wins ({percent(markets[selected].modeProbability)}) · weighted profile #{defaultProfileRanks[selected]}</p></div></div><div className="variance"><strong>{spread}</strong><span>rank-position spread</span></div></div>
    <WinDensity market={markets[selected]} teamName={team.name}/>
    <div className="profileSummary">{entries.map(({category,entry})=><div key={category.id}><span>{category.short}</span><RankPill rank={entry.rank}/><small>{entry.subject}</small></div>)}</div>
    <div className="profileEvidence">{entries.map(({category,entry})=><article key={category.id} className={`profileCard cat-${category.id}`}><header><div><span>{category.label} · Tier {entry.tier}</span><h3>{entry.subject}</h3><p>{entry.tierLabel}</p></div><RankPill rank={entry.rank}/></header><EvidenceBody entry={entry} category={category.id}/></article>)}</div>
    {previews.length>0&&<div className="teamPreviewBlock"><header><div><span>New team-preview evidence</span><h3>Scoped context, deliberately outside the score.</h3></div><p>These episodes mix roster, coaching, schedule, health, regression and betting prices. Their evidence is retained, but their 0 weight prevents partial coverage and market circularity from changing the league profile.</p></header><div className="profileEvidence">{previews.map(({source,entry})=><article className="profileCard previewCard" key={source.id}><header><div><span>{source.short} · {source.coverageMode.replace('-', ' ')}</span><h3>{team.name}</h3><p>{source.label}</p></div><b className="zeroWeight">0</b></header><PreviewEvidenceBody source={source} entry={entry}/></article>)}</div></div>}
  </section>;
}

function CategoryView({id}:{id:CategoryId}) {
  const category = categoryById[id];
  const [query,setQuery] = useState('');
  const entries = category.evidence.filter((e:Evidence)=>`${teamByAbbr[e.team].name} ${e.subject} ${e.people.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="reportShell">
    <SectionIntro kicker={`Exact 1–32 ranking · ${category.short}`} title={category.label} copy={category.methodology} />
    <div className="categoryToolbar"><div><strong>{category.evidence.length}</strong><span>teams audited</span></div><div><strong>{category.evidence.reduce((n:number,e:Evidence)=>n+e.positives.length+e.concerns.length+e.context.length,0)}</strong><span>evidence points</span></div><label>Filter<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Team, player, coach…" /></label></div>
    <div className="rankingList">{entries.map((entry:Evidence)=><details key={entry.team} className="rankCard"><summary><span className="ordinal">{String(entry.rank).padStart(2,'0')}</span><span className="teamBadge">{entry.team}</span><div><strong>{teamByAbbr[entry.team].name}</strong><small>{entry.subject}</small></div><span className="tierTag">T{entry.tier} · {entry.tierLabel}</span><span className="expand">+</span></summary><EvidenceBody entry={entry} category={id}/></details>)}</div>
  </section>;
}

function TeamPreviews({openTeam}:{openTeam:(abbr:string)=>void}) {
  return <section className="reportShell">
    <SectionIntro kicker="Scoped team evidence" title="Division previews belong in the guide—not in a false league score." copy={`The three preview episodes cover ${previewTeamCount} unique teams, blend football analysis with market prices and use incomplete or incompatible ranking schemes. Exact ballots stay distinct; discussion order and projections are never promoted into rankings.`} />
    <div className="previewRule"><strong>Registry rule</strong><p>A source becomes scoring-eligible only when it supplies comparable full-league coverage with a stable rank or score contract. Until then it receives analysis weight 0 and appears as qualitative evidence.</p></div>
    <div className="previewSourceList">{previewSources.map(source=>{
      const groups = Object.entries(Object.groupBy(source.coveredTeams.map(abbr=>teamByAbbr[abbr]),team=>`${team.conference} ${team.division}`));
      return <article className="previewSourceCard" key={source.id}>
        <header><div><span>{source.publisher} · {source.source.format}</span><h3>{source.label}</h3><p>{source.analysisRationale}</p></div><div className="sourceStatus"><b>0</b><small>analysis weight</small></div></header>
        <div className="previewMeta"><span>{source.coveredTeams.length} teams</span><span>{source.coverageMode.replace('-', ' ')}</span><span>{source.rankingScheme.replaceAll('-', ' ')}</span><span>market-aware</span></div>
        <div className="ballotGrid"><div><div className="eyebrow">Exact source ballots</div>{source.ballots.map(ballot=><div className="ballot" key={`${source.id}-${ballot.speaker}-${ballot.scope}`}><strong>{ballot.speaker}</strong><small>{ballot.scope}{ballot.complete?'':' · incomplete'}</small><ol>{ballot.positions.map(position=><li key={`${position.rank}-${position.team}`}><b>{position.rank}</b><button onClick={()=>openTeam(position.team)}>{position.team}</button><span>{teamByAbbr[position.team].name}</span></li>)}</ol>{ballot.note&&<p>{ballot.note}</p>}</div>)}</div><div><div className="eyebrow">Kalshi scoped order</div>{groups.map(([group,clubs])=><div className="ballot marketBallot" key={group}><strong>{group}</strong><small>current modeled E[W] order</small><ol>{[...clubs!].sort((a,b)=>markets[a.abbr].expectedWins-markets[b.abbr].expectedWins).reverse().map((team,index)=><li key={team.abbr}><b>{index+1}</b><button onClick={()=>openTeam(team.abbr)}>{team.abbr}</button><span>{markets[team.abbr].expectedWins.toFixed(2)} modeled wins</span></li>)}</ol></div>)}</div></div>
        <details className="ambiguityLedger"><summary>Transcription and ranking audit</summary><ul>{source.ambiguities.map(item=><li key={item}>{item}</li>)}</ul></details>
        <div className="previewTeamGrid">{source.evidence.map(entry=><button key={entry.team} onClick={()=>openTeam(entry.team)}><b>{entry.team}</b><span>{teamByAbbr[entry.team].name}</span><small>{entry.context[0]}</small></button>)}</div>
        <footer><span>SHA-256 {source.source.hash.slice(0,12)}…{source.source.hash.slice(-8)}</span><a href={source.source.url} target="_blank" rel="noreferrer">Open public source ↗</a></footer>
      </article>;
    })}</div>
  </section>;
}

function Markets({openTeam}:{openTeam:(abbr:string)=>void}) {
  const [conference,setConference] = useState<'All'|'AFC'|'NFC'>('All');
  const visible = teams.filter(t=>conference==='All'||t.conference===conference).sort((a,b)=>a.conference.localeCompare(b.conference)||a.division.localeCompare(b.division)||markets[a.abbr].marketRank-markets[b.abbr].marketRank);
  const groups = Object.groupBy(visible,t=>`${t.conference} ${t.division}`);
  const visibleTotals = winAggregates.divisions.filter(total=>conference==='All'||total.conference===conference);
  return <section className="reportShell">
    <SectionIntro kicker="Market expectations" title="Complete market curves, team by team." copy="Kalshi supplies all 17 win tails for every club. Those monotone curves drive the expected-win order, exact-win densities and conference/division totals; the sportsbook board appears only where it powers the separate cross-market scan." />
    <div className="marketHero"><div><strong>{marketAudit.current_season_markets}</strong><span>open Kalshi win contracts</span></div><div><strong>{marketAudit.teams_with_all_17_tails}</strong><span>complete 17-tail team ladders</span></div><div><strong>18</strong><span>derived exact-win outcomes per team</span></div><a href={kalshiMarketSource.url} target="_blank" rel="noreferrer">Kalshi API ↗</a></div>
    <div className="marketMeta"><p><strong>Snapshot:</strong> Kalshi {kalshiMarketSource.retrieved}. The authenticated connection was verified read-only; no account response was retained. Prices can move after capture.</p><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="marketAudit"><span><b>{marketAudit.raw_midpoint_monotonicity_violations}</b> raw midpoint violations</span><span><b>{marketAudit.isotonic_midpoint_points_adjusted}</b> points isotonic-adjusted</span><span><b>{marketAudit.all_curves_monotone_after?'PASS':'REVIEW'}</b> monotone audit</span><span><b>17 / 17</b> tails for every team</span></div>
    <div className="aggregateBlock"><header><div><span>Total wins by group</span><h3>Distribution-based midpoint totals</h3></div><p>Brackets sum the monotone bid and ask curves. They are market-width bounds, not confidence intervals or joint portfolio guarantees.</p></header><div className="conferenceTotals"><article><span>League</span><strong>{wins(winAggregates.league.midpoint_estimate)}</strong><small>{wins(winAggregates.league.bid_bound)}–{wins(winAggregates.league.ask_bound)} · 272-game ceiling</small></article>{winAggregates.conferences.map(total=><article key={total.conference}><span>{total.conference}</span><strong>{wins(total.midpoint_estimate)}</strong><small>{wins(total.bid_bound)}–{wins(total.ask_bound)} · {total.team_count} teams</small></article>)}</div><div className="divisionTotals">{visibleTotals.map(total=><article key={total.label}><span>{total.label}</span><strong>{wins(total.midpoint_estimate)}</strong><small>{wins(total.bid_bound)}–{wins(total.ask_bound)}</small></article>)}</div></div>
    <div className="divisionGrid">{Object.entries(groups).map(([group,clubs])=>{const total=winAggregates.divisions.find(item=>item.label===group);return <article className="divisionCard" key={group} tabIndex={0} aria-label={`${group} win market table; scroll horizontally for all columns`}><header><span>{group.split(' ')[0]}</span><h3>{group.split(' ')[1]}</h3><small>{total ? `${wins(total.midpoint_estimate)} modeled wins` : ''}</small></header><div className="marketTable"><div className="marketHead"><span>Team</span><span>Kalshi E[W]</span><span>Bid–ask E[W]</span><span>K rank</span><span>Most likely</span><span>Peak p</span><span>Avg. spread</span><span>Coverage</span><span>Profile</span></div>{clubs!.map((t:Team)=>{const market=markets[t.abbr];return <div className="marketRow" key={t.abbr}><span><b>{t.abbr}</b>{t.name}<small>Weighted podcast profile #{defaultProfileRanks[t.abbr]}</small></span><strong>{market.expectedWins.toFixed(2)}</strong><span>{market.expectedWinsBid.toFixed(1)}–{market.expectedWinsAsk.toFixed(1)}</span><span><b>#{market.marketRank}</b></span><span><b>{market.modeWins} wins</b></span><span>{percent(market.modeProbability)}</span><span>{percent(market.kalshiAverageSpread)}</span><span><b>{market.coverageLabel}</b><small>{market.thresholdCount} / 17 tails</small></span><button className="profileJump" onClick={()=>openTeam(t.abbr)}>Density →</button></div>})}</div></article>})}</div>
    <div className="disclaimer"><strong>What is—and is not—estimated</strong><p>Each profile’s exact-win density is the difference between adjacent monotone Kalshi tail midpoints. Kalshi E[W] is their probability-weighted mean, not a directly quoted expected-win contract. The aggregate range sums marginal bid/ask curves and is not a jointly executable portfolio guarantee.</p></div>
  </section>;
}

function CrossMarketScanner() {
  return <div className="edgeBoard analysisScanner"><header><div><span>Separate module · market versus market</span><h3>Cross-market scanner</h3></div><p>Same-threshold, paired sportsbook probabilities versus executable Kalshi asks. This module does not use the podcast profile.</p></header><div className="scannerMeta"><p><strong>Snapshots:</strong> sportsbooks {marketSource.retrieved}; Kalshi {kalshiMarketSource.retrieved}.</p><p>Minimum 5¢ pre-fee edge · maximum 12¢ spread · displayed top-of-book size required.</p></div><div className="edgeTable"><div className="edgeHead"><span>Team</span><span>Contract</span><span>Sportsbook p</span><span>Kalshi ask</span><span>Pre-fee edge</span><span>Spread</span><span>Top size</span></div>{betCandidates.map(candidate=><a className="edgeRow" href={`https://external-api.kalshi.com/trade-api/v2/markets/${candidate.kalshi_ticker}`} target="_blank" rel="noreferrer" key={`${candidate.kalshi_ticker}-${candidate.side}`}><b>{candidate.team}</b><span>{candidate.contract}</span><span>{percent(candidate.sportsbook_probability)}</span><span>{percent(candidate.kalshi_ask)}</span><strong>+{candidate.pre_fee_edge_cents.toFixed(2)}¢</strong><span>{(candidate.kalshi_spread*100).toFixed(0)}¢</span><span>{candidate.available_size?.toLocaleString()??'—'}</span></a>)}</div><p className="scannerFootnote">Timestamped research candidates only. Prices are not simultaneous; edge excludes fees and slippage.</p></div>;
}

function PreviewKalshiComparison({threshold,openTeam}:{threshold:number;openTeam:(abbr:string)=>void}) {
  const rows = previewSources.flatMap(source=>source.ballots.map(ballot=>{
    const firstTeam = teamByAbbr[ballot.positions[0].team];
    const scopeTeams = source.coveredTeams.filter(abbr=>teamByAbbr[abbr].conference===firstTeam.conference&&teamByAbbr[abbr].division===firstTeam.division);
    const tailOrder = [...scopeTeams].sort((left,right)=>probabilityAtLeast(markets[right].distribution,threshold)-probabilityAtLeast(markets[left].distribution,threshold)||left.localeCompare(right));
    const tailRanks = Object.fromEntries(tailOrder.map((abbr,index)=>[abbr,index+1]));
    const statedGap = ballot.positions.reduce((sum,position)=>sum+Math.abs(position.rank-tailRanks[position.team]),0);
    return {source,ballot,tailOrder,statedGap};
  }));
  return <div className="previewCompare"><header><div><span>Separate module · scoped source ballots</span><h3>Preview ballots versus Kalshi ≥{threshold}-win tails</h3></div><p>Division-only ordinal comparison. It does not create a league score, probability forecast or betting signal.</p></header><div className="previewCompareTable"><div className="previewCompareHead"><span>Source</span><span>Speaker</span><span>Exact or stated order</span><span>Kalshi scoped tail order</span><span>Stated-slot gap</span></div>{rows.map(({source,ballot,tailOrder,statedGap})=><div className="previewCompareRow" key={`${source.id}-${ballot.speaker}-${ballot.scope}`}><span><b>{source.short}</b><small>{ballot.scope}</small></span><strong>{ballot.speaker}</strong><span className="orderLine">{ballot.positions.map(position=><button key={position.team} onClick={()=>openTeam(position.team)}>{position.rank}. {position.team}</button>)}</span><span className="orderLine">{tailOrder.map((abbr,index)=><button key={abbr} onClick={()=>openTeam(abbr)}>{index+1}. {abbr} <small>{percent(probabilityAtLeast(markets[abbr].distribution,threshold))}</small></button>)}</span><span><b>{statedGap}</b><small>sum of absolute rank gaps{ballot.complete?'':' · stated slots only'}</small></span></div>)}</div><footer><span>Only source-stated ballots appear; AFC West remains intentionally absent.</span><span>Preview analysis is market-aware and remains weight 0.</span></footer></div>;
}

function MarketAnalysis({openTeam}:{openTeam:(abbr:string)=>void}) {
  const [weights,setWeights] = useState<Record<string,number>>({...defaultAnalysisWeights});
  const [threshold,setThreshold] = useState(11);
  const normalized = normalizeCategoryWeights(categories,weights) as Record<string,number>;
  const profileRanks = profileRanksFor(weights);
  const equalWeights = Object.fromEntries(categories.map(category=>[category.id,1]));
  const equalRanks = profileRanksFor(equalWeights);
  const tailProbabilities = Object.fromEntries(teams.map(team=>[team.abbr,probabilityAtLeast(markets[team.abbr].distribution,threshold)]));
  const tailRanks = rankScores(tailProbabilities) as Record<string,number>;
  const rows = teams.map(team=>{
    const market = markets[team.abbr];
    const tailGap = tailRanks[team.abbr]-profileRanks[team.abbr];
    const meanGap = market.marketRank-profileRanks[team.abbr];
    return {
      team,
      profileScore:profileScoreFor(team.abbr,weights),
      profileRank:profileRanks[team.abbr],
      equalRank:equalRanks[team.abbr],
      market,
      downside:probabilityAtMost(market.distribution,6),
      upperTail:tailProbabilities[team.abbr],
      tailRank:tailRanks[team.abbr],
      tailGap,
      meanGap,
      volatility:distributionMoments(market.distribution).standardDeviation,
      read:tailGap>=6?'Podcast profile stronger':tailGap<=-6?'Kalshi tail stronger':'Broad agreement',
    };
  }).sort((a,b)=>Math.abs(b.tailGap)-Math.abs(a.tailGap)||Math.abs(b.meanGap)-Math.abs(a.meanGap)||a.profileRank-b.profileRank);
  const sensitivityCount = rows.filter(row=>Math.abs(row.profileRank-row.equalRank)>=5).length;
  const changeWeight = (id:string,value:number) => setWeights(current=>{
    const next = {...current,[id]:value};
    return Object.values(next).some(weight=>weight>0) ? next : current;
  });
  return <section className="reportShell">
    <SectionIntro kicker="Analysis versus market" title="Where the podcast profile disagrees with the whole curve." copy="The podcast side is a weighted, incomplete strength signal; the Kalshi side is a full market distribution. Gaps are research prompts, never podcast-implied probabilities or trade recommendations." />
    <div className="analysisNotice"><strong>Three deliberately separated comparisons live here.</strong><p>Podcast × Kalshi tests the incomplete league profile; preview ballots compare only within their stated division; the cross-market scanner compares sportsbook prices with Kalshi and does not use podcast evidence.</p></div>
    <div className="weightWorkbench"><header><div><span>Provisional importance model</span><h3>Weight what should matter—not merely what exists.</h3></div><div className="weightActions"><button onClick={()=>setWeights({...defaultAnalysisWeights})}>Restore 40 / 25 / 20 / 15</button><button onClick={()=>setWeights(Object.fromEntries(categories.map(category=>[category.id,1])))}>Equal-weight reference</button></div></header><div className="weightGrid">{categories.map(category=><label key={category.id}><span><b>{category.label}</b><strong>{(normalized[category.id]*100).toFixed(0)}%</strong></span><input aria-label={`${category.label} analysis weight`} type="range" min="0" max="100" step="1" value={weights[category.id]??category.analysisWeight} onChange={event=>changeWeight(category.id,Number(event.target.value))}/><small>{category.analysisRationale}</small></label>)}</div><footer><span>Weights normalize to 100%; raw slider values are importance points.</span><span>Only complete, unique 1–32 rankings enter these controls. The {previewSources.length} market-aware previews are registered separately at weight 0.</span></footer></div>
    <div className="analysisControls"><label>Inspect Kalshi tail<select value={threshold} onChange={event=>setThreshold(Number(event.target.value))}>{Array.from({length:17},(_,index)=>index+1).map(value=><option value={value} key={value}>At least {value} win{value===1?'':'s'}</option>)}</select></label><div><span>Weighted/equal sensitivity</span><strong>{sensitivityCount}</strong><small>teams move at least five profile ranks</small></div><div><span>Largest selected-tail gap</span><strong>{Math.abs(rows[0].tailGap)}</strong><small>rank places · {rows[0].team.abbr}</small></div><div><span>Scored / preview inputs</span><strong>{categories.length} / {previewSources.length}</strong><small>previews are registered at weight 0</small></div></div>
    <div className="analysisTableWrap" tabIndex={0} aria-label="Podcast profile versus Kalshi tail comparison; scroll horizontally for all columns"><div className="analysisTable"><div className="analysisHead"><span>Team</span><span>Weighted profile</span><span>Equal reference</span><span>Kalshi mean</span><span>Downside ≤6</span><span>Tail ≥{threshold}</span><span>Tail gap</span><span>σ wins</span><span>Read</span><span>Evidence</span></div>{rows.map(row=><div className="analysisRow" key={row.team.abbr}><span><b>{row.team.abbr}</b>{row.team.name}<small>{row.team.conference} {row.team.division}</small></span><span><b>#{row.profileRank}</b><small>{row.profileScore.toFixed(1)} / 100</small></span><span><b>#{row.equalRank}</b><small>{row.equalRank===row.profileRank?'no movement':`${row.equalRank>row.profileRank?'+':'−'}${Math.abs(row.equalRank-row.profileRank)} places`}</small></span><span><b>{row.market.expectedWins.toFixed(2)}</b><small>rank #{row.market.marketRank} · gap {row.meanGap>0?'+':''}{row.meanGap}</small></span><span>{percent(row.downside)}</span><span><b>{percent(row.upperTail)}</b><small>tail rank #{row.tailRank}</small></span><strong className={row.tailGap>=6?'profileBull':row.tailGap<=-6?'marketBull':''}>{row.tailGap>0?'+':''}{row.tailGap}</strong><span>{row.volatility.toFixed(2)}</span><span><b>{row.read}</b><small>{row.tailGap>0?'profile ranks better':row.tailGap<0?'market tail ranks better':'same ordinal rank'}</small></span><button className="profileJump" onClick={()=>openTeam(row.team.abbr)}>Open profile</button></div>)}</div></div>
    <div className="analysisGuardrail"><strong>Interpretation guardrail</strong><p>Profile rank is a weighted ordering of the available podcast inputs, not a forecasted win distribution. Defense, schedule, special teams and changing injuries are missing. A positive tail gap means only that the weighted profile ranks better than Kalshi’s league ordering at that threshold.</p></div>
    <PreviewKalshiComparison threshold={threshold} openTeam={openTeam}/>
    <CrossMarketScanner/>
  </section>;
}

function Synthesis({openTeam}:{openTeam:(abbr:string)=>void}) {
  const profiles = teams.map(t=>{const ranks=categories.map(c=>evidenceByCategory[c.id][t.abbr].rank);return {t,profileRank:defaultProfileRanks[t.abbr],score:profileScoreFor(t.abbr),best:Math.min(...ranks),worst:Math.max(...ranks),spread:Math.max(...ranks)-Math.min(...ranks),marketRank:marketOrder[t.abbr]};});
  const polarized=[...profiles].sort((a,b)=>b.spread-a.spread).slice(0,8);
  const supportGap=[...profiles].sort((a,b)=>(b.marketRank-b.profileRank)-(a.marketRank-a.profileRank)).slice(0,6);
  return <section className="reportShell">
    <SectionIntro kicker="Cross-category synthesis" title="Where the inputs reinforce—and contradict—one another." copy="This layer keeps source opinion separate from derived analysis. It uses exact Action category ranks and Kalshi's complete-ladder modeled expected-win order; defense, schedule and injuries remain missing." />
    <div className="synthesisLead"><h3>The strongest early signal is structure, not stardom.</h3><p>Los Angeles, San Francisco and Chicago rank well because advantages repeat across categories. Cincinnati and Buffalo are more fragile: elite quarterback value has to overcome a weak or uncertain part of the organizational stack. That is exactly the sort of disagreement worth monitoring as defense is added.</p></div>
    <div className="synthesisGrid"><article><div className="eyebrow">Most polarized profiles</div><h3>One ranking cannot describe these teams.</h3><div className="polarList">{polarized.map(p=><button key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><b>{p.t.abbr}</b><span><i style={{left:`${(p.best-1)/31*100}%`,right:`${100-(p.worst-1)/31*100}%`}}/></span><small>#{p.best} → #{p.worst}</small></button>)}</div></article><article><div className="eyebrow">Weighted profile stronger than Kalshi mean rank</div><h3>Disagreements for further research.</h3>{supportGap.map(p=><button className="gapRow" key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><span>{p.t.name}</span><b>Profile #{p.profileRank} · {p.score.toFixed(1)}</b><em>Kalshi rank #{p.marketRank}</em></button>)}<p className="fineprint">This compares the provisional 40/25/20/15 podcast profile with the complete-ladder Kalshi midpoint rank. It is not a bet recommendation: defense, schedule, injuries and interactions between units are absent, while bid/ask width still matters.</p></article></div>
    <div className="thesisGrid"><article><span>Coaching as multiplier</span><h3>SF · LAR · CHI · LAC</h3><p>The top four staffs all have a specific mechanism for making other units better: play design, organization, protection/run answers or defensive structure.</p></article><article><span>Stars versus weak links</span><h3>CIN · BUF · GB</h3><p>These teams expose the project’s central tension. A top quarterback can erase problems—until coaching, line health or pass-catcher depth creates the one failure the opponent can target.</p></article><article><span>Regression pressure</span><h3>SEA · MIN · DEN</h3><p>Close-game records, lead-heavy game scripts and unusually healthy or efficient stretches are repeatedly flagged as things that may not repeat.</p></article><article><span>Aligned warning</span><h3>MIA · CLE · TEN</h3><p>Multiple independent categories agree. Without a defensive surprise, the current evidence offers very few ways for these teams to beat low market expectations.</p></article></div>
    <div className="nextLayer"><strong>Designed for defense—and whatever comes next</strong><p>Each podcast category carries its evidence, source audit, provisional importance and rationale in one registry. Adding defense or another complete 1–32 episode automatically expands navigation, profiles, weights, sensitivity analysis and the market-gap view.</p></div>
  </section>;
}

function Sources() {
  return <section className="reportShell">
    <SectionIntro kicker="Provenance & completeness" title="Built so omissions and interpretation can be audited." copy={`${sourceRegistry.length} source documents were acquired read-only, snapshotted privately and hashed before extraction. The public artifact retains publisher links and checksums without exposing private-library identifiers or raw copyrighted material.`} />
    <div className="qaBanner"><strong>PASS</strong><div><h3>{categories.length*teams.length} expected scored ranks · {categories.length*teams.length} represented · 0 duplicates · 0 missing teams</h3><p>All four scoring-eligible categories contain each NFL team exactly once. {previewSources.length} partial, market-aware previews cover {previewTeamCount} unique teams and are explicitly weight 0.</p></div></div>
    <div className="sourceGrid">{categories.map(c=>{const m=sourceMeta[c.id];return <article key={c.id}><span>{c.short}</span><h3>{m.label}</h3><dl><div><dt>Words</dt><dd>{m.words.toLocaleString()}</dd></div><div><dt>Lines</dt><dd>{c.source.lines.toLocaleString()}</dd></div><div><dt>SHA-256</dt><dd>{c.source.hash}</dd></div><div><dt>Analysis weight</dt><dd>{c.analysisWeight} pts</dd></div><div><dt>Coverage</dt><dd>32 / 32</dd></div></dl><div><a href={m.source} target="_blank" rel="noreferrer">Publisher transcript ↗</a></div></article>})}</div>
    <div className="sourceGrid previewSourceGrid">{previewSources.map(source=><article key={source.id}><span>{source.short}</span><h3>{source.label}</h3><dl><div><dt>Canonical source</dt><dd>{source.source.format}</dd></div>{source.source.words&&<div><dt>Words</dt><dd>{source.source.words.toLocaleString()}</dd></div>}{source.source.durationSeconds&&<div><dt>Duration</dt><dd>{Math.floor(source.source.durationSeconds/60)}m {source.source.durationSeconds%60}s</dd></div>}<div><dt>SHA-256</dt><dd>{source.source.hash.slice(0,8)}…{source.source.hash.slice(-7)}</dd></div><div><dt>Analysis weight</dt><dd>0 pts</dd></div><div><dt>Coverage</dt><dd>{source.coveredTeams.length} / 32</dd></div></dl><div><a href={source.source.url} target="_blank" rel="noreferrer">Open public source ↗</a></div></article>)}</div>
    <div className="methodPanel"><article><div className="eyebrow">Extraction contract</div><h3>Substance preserved; filler removed.</h3><ol><li>Lock the corpus and hashes before interpretation.</li><li>Preserve stated rankings exactly; never convert discussion order, odds or projections into ranks.</li><li>Store substantive positives, concerns, qualifiers and methodological rules as paraphrased evidence.</li><li>Keep source opinion separate from report-derived synthesis.</li><li>Require comparable full-league coverage before a source can receive scoring weight.</li></ol></article><article><div className="eyebrow">Known audit exceptions</div><h3>Transcription ambiguity is disclosed, never silently repaired.</h3><ul><li>QB: one garbled Jordan Love rate claim is described but not reconstructed.</li><li>OL: “Keelan Rutledge” may be a transcript error; the source wording is preserved.</li><li>Skill: several uncertain names remain flagged; one Saints backfield name is omitted rather than guessed.</li><li>NFC East: several personnel names, one Dallas sequence and some speaker handoffs remain ambiguous.</li><li>AFC Part 1: the library item lacked a creator transcript; analysis used a local machine working copy of canonical publisher audio. Systematic name errors are disclosed, numeric claims were spot-checked and uncertain names were omitted.</li><li>AFC Part 2: the creator transcript garbles two numeric projections and several names/actions; only clear winner picks are normalized, and no divisional or conference order is inferred.</li></ul></article></div>
    <div className="marketSource"><div><span>Sportsbook source</span><h3>{marketSource.label}</h3><p>{marketSource.note}</p><small>{marketSource.updated} · captured {marketSource.retrieved} · 32/32 paired primary quotes · {sportsbookMarketAudit.teams_with_multiple_thresholds} multi-threshold teams</small></div><a href={marketSource.url} target="_blank" rel="noreferrer">Open current board ↗</a></div>
    <div className="marketSource"><div><span>Prediction-market source</span><h3>{kalshiMarketSource.label}</h3><p>All 17 win thresholds for all 32 teams. Authentication was verified read-only; no account payload or credential was retained.</p><small>captured {kalshiMarketSource.retrieved} · 544 open contracts · 32/32 complete ladders · midpoint expected wins labeled as modeled</small></div><a href={kalshiMarketSource.documentation} target="_blank" rel="noreferrer">API method ↗</a></div>
    <div className="versionNote"><strong>Edition 5 · Aug. 24, 2026</strong><span>{categories.length} complete unit/organizational rankings plus {previewSources.length} zero-weight team previews, provisional importance weights, paired de-vigged sportsbook prices and complete Kalshi win-tail ladders. AFC preview coverage is complete; defense remains pending. Market snapshots remain append-only.</span></div>
  </section>;
}

export default function Home() {
  const [tab,setTab] = useState<TabId>('briefing');
  const [selectedTeam,setSelectedTeam] = useState('LAR');
  useEffect(()=>{
    const id=window.location.hash.slice(1) as TabId;
    if(!tabs.some(tabOption=>tabOption.id===id)) return;
    const frame=window.requestAnimationFrame(()=>setTab(id));
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  const go=(id:TabId)=>{setTab(id);window.history.replaceState(null,'',`#${id}`);window.scrollTo({top:0,behavior:'smooth'});};
  const openTeam=(abbr:string)=>{setSelectedTeam(abbr);go('teams');};
  return <main>
    <header className="masthead"><div className="eyebrow">2026 NFL Outlook Field Guide</div><div className="mastheadRow"><div><h1>The shape of every team</h1><p className="deck">Complete unit rankings plus scoped team previews, weighted transparently against the full market.</p></div><div className="edition"><span>Preseason · edition 5</span><strong>Data through Aug. 24</strong></div></div></header>
    <nav className="tabRail" aria-label="Report sections">{tabs.map(t=><button className={tab===t.id?'active':''} key={t.id} onClick={()=>go(t.id)} type="button">{t.label}</button>)}</nav>
    {tab==='briefing'&&<Briefing go={go}/>} {tab==='matrix'&&<Matrix openTeam={openTeam}/>} {tab==='teams'&&<TeamProfiles selected={selectedTeam} setSelected={setSelectedTeam}/>} {categoryIds.has(tab)&&<CategoryView id={tab}/>} {tab==='previews'&&<TeamPreviews openTeam={openTeam}/>} {tab==='markets'&&<Markets openTeam={openTeam}/>} {tab==='analysis'&&<MarketAnalysis openTeam={openTeam}/>} {tab==='synthesis'&&<Synthesis openTeam={openTeam}/>} {tab==='sources'&&<Sources/>}
    <footer><span>2026 NFL Outlook Field Guide</span><p>Source opinion: cited podcast episodes. Derived synthesis: Field Guide analysis. Modeled market figures are labeled; prices move, so verify before acting.</p><button onClick={()=>go('sources')}>Methods & sources</button></footer>
  </main>;
}
