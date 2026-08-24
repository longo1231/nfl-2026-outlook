'use client';

import { useEffect, useMemo, useState } from 'react';
import { betCandidates, categories, CategoryId, claimCount, compositeFor, evidenceByCategory, kalshiMarketSource, marketAudit, markets, marketSource, sourceMeta, sportsbookMarketAudit, teams, winAggregates, type Evidence, type Market, type Team } from './data';

type TabId = 'briefing'|'matrix'|'teams'|'qb'|'coaching'|'ol'|'skill'|'markets'|'synthesis'|'sources';
const tabs: {id:TabId; label:string}[] = [
  {id:'briefing',label:'Briefing'}, {id:'matrix',label:'League matrix'}, {id:'teams',label:'Team profiles'},
  {id:'qb',label:'Quarterbacks'}, {id:'coaching',label:'Coaching'}, {id:'ol',label:'Offensive lines'},
  {id:'skill',label:'Skill positions'}, {id:'markets',label:'Win markets'}, {id:'synthesis',label:'Synthesis'}, {id:'sources',label:'Sources & QA'},
];
const teamByAbbr = Object.fromEntries(teams.map(t => [t.abbr,t]));
const categoryById = Object.fromEntries(categories.map(c => [c.id,c]));
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
  const leaders = [...teams].sort((a,b)=>compositeFor(a.abbr)-compositeFor(b.abbr)).slice(0,6);
  return <section className="reportShell">
    <SectionIntro kicker="Executive briefing" title="Four lenses. One incomplete but revealing map." copy="This is a faithful evidence digest, not a new power ranking. The composite simply averages the four available 1–32 ranks; defense and future episodes will change the picture." />
    <div className="heroGrid">
      <article className="leadStory"><div className="eyebrow inverse">The clearest complete offense</div><h3>Los Angeles has the fewest places to hide a weakness.</h3><p>The Rams pair the No. 1 skill group with No. 2 coaching, a top-ten line and the reigning-MVP quarterback at No. 8. Their 11.5-win market is expensive, but the inputs broadly confirm it.</p><button onClick={()=>go('teams')}>Open team profiles</button></article>
      <div className="statStack">
        <div><strong>128/128</strong><span>team-category ranks reconciled</span></div>
        <div><strong>{claimCount}</strong><span>substantive evidence points retained</span></div>
        <div><strong>48,659</strong><span>source words snapshotted read-only</span></div>
      </div>
    </div>
    <div className="briefCards">
      <article><span>Balanced riser</span><h3>Chicago</h3><p>Ranks 3rd coaching, 7th line, 11th skill and 13th QB. The 9.5 market asks for confirmation, not a miracle.</p></article>
      <article><span>Structural tension</span><h3>Cincinnati</h3><p>Burrow (3) and the skill group (5) collide with coaching (31) and line (20). A 10.5 total is a direct bet on the stars outrunning the structure.</p></article>
      <article><span>Health fragility</span><h3>Chargers</h3><p>A top-four coach and nominal No. 4 line support Herbert, but center and tackle injuries already reduce the live line view to roughly 8th–10th.</p></article>
      <article><span>Aligned teardown</span><h3>Miami</h3><p>Skill ranks 32nd, quarterback 26th, line 26th and coaching 26th. The market agrees at only 3.5 wins.</p></article>
    </div>
    <div className="leaderStrip"><div><div className="eyebrow">Partial composite leaders</div><p>Lower is stronger. No defense included.</p></div>{leaders.map((t,i)=><button key={t.abbr} onClick={()=>go('matrix')}><b>{i+1}</b><span>{t.abbr}</span><small>{compositeFor(t.abbr).toFixed(2)}</small></button>)}</div>
    <div className="readMe"><strong>How to use this</strong><p>Begin in the matrix for league shape, open a team profile for every supporting point, then compare the result with market expectations. Treat disagreements as research prompts—not automatic bets.</p></div>
  </section>;
}

function Matrix({openTeam}:{openTeam:(abbr:string)=>void}) {
  const [sort,setSort] = useState<'composite'|CategoryId|'market'>('composite');
  const [conference,setConference] = useState<'All'|'AFC'|'NFC'>('All');
  const [query,setQuery] = useState('');
  const rows = useMemo(()=>teams.filter(t=>(conference==='All'||t.conference===conference) && `${t.name} ${t.abbr}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==='market') return markets[a.abbr].marketRank-markets[b.abbr].marketRank || a.name.localeCompare(b.name);
    if(sort==='composite') return compositeFor(a.abbr)-compositeFor(b.abbr);
    return evidenceByCategory[sort][a.abbr].rank-evidenceByCategory[sort][b.abbr].rank;
  }),[sort,conference,query]);
  return <section className="reportShell">
    <SectionIntro kicker="League matrix" title="Strength, weakness, and the gaps between." copy="Ranks are Brandon Anderson’s exact 1–32 order. Click a team for its full evidence profile. The composite is a transparent, equal-weight average—not a forecast." />
    <div className="controls"><label>Find a team<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or abbreviation" /></label><label>Order by<select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="composite">Partial composite</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}<option value="market">Kalshi expected-win rank</option></select></label><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="legend"><span><i className="elite"/>1–8</span><span><i className="good"/>9–16</span><span><i className="warn"/>17–24</span><span><i className="poor"/>25–32</span><em>Lower = stronger</em></div>
    <div className="matrixCard full"><div className="matrixHead matrixGrid"><span>Team</span>{categories.map(c=><button onClick={()=>setSort(c.id)} key={c.id}>{c.short}</button>)}<button onClick={()=>setSort('composite')}>Avg.</button><button onClick={()=>setSort('market')}>Mkt.</button></div>{rows.map(t=><button className="matrixRow matrixGrid" key={t.abbr} onClick={()=>openTeam(t.abbr)}><div className="teamCell"><span className="teamBadge">{t.abbr}</span><div><strong>{t.name}</strong><small>{t.conference} {t.division}</small></div></div>{categories.map(c=><RankPill key={c.id} rank={evidenceByCategory[c.id][t.abbr].rank}/>) }<strong className="composite">{compositeFor(t.abbr).toFixed(2)}</strong><span className="marketMini" title={`Kalshi full-ladder expected-win rank; ${markets[t.abbr].expectedWins?.toFixed(2)} modeled wins`}>#{markets[t.abbr].marketRank}</span></button>)}</div>
  </section>;
}

function TeamProfiles({selected,setSelected}:{selected:string;setSelected:(v:string)=>void}) {
  const team = teamByAbbr[selected];
  const entries = categories.map(c=>({category:c,entry:evidenceByCategory[c.id][selected]}));
  const spread = Math.max(...entries.map(x=>x.entry.rank))-Math.min(...entries.map(x=>x.entry.rank));
  return <section className="reportShell">
    <SectionIntro kicker="Team dossier" title="Every retained argument, plus the full market shape." copy="Choose any club to see all four exact ranks, every supporting point and the complete Kalshi-derived probability density for zero through 17 wins." />
    <div className="teamPicker"><label>Team<select value={selected} onChange={e=>setSelected(e.target.value)}>{[...teams].sort((a,b)=>a.name.localeCompare(b.name)).map(t=><option value={t.abbr} key={t.abbr}>{t.name}</option>)}</select></label><div className="teamIdentity"><span>{team.abbr}</span><div><h3>{team.name}</h3><p>{team.conference} {team.division} · Kalshi E[W] {markets[selected].expectedWins.toFixed(2)} · most likely {markets[selected].modeWins} wins ({percent(markets[selected].modeProbability)}) · Action input average {compositeFor(selected).toFixed(2)}</p></div></div><div className="variance"><strong>{spread}</strong><span>rank-position spread</span></div></div>
    <WinDensity market={markets[selected]} teamName={team.name}/>
    <div className="profileSummary">{entries.map(({category,entry})=><div key={category.id}><span>{category.short}</span><RankPill rank={entry.rank}/><small>{entry.subject}</small></div>)}</div>
    <div className="profileEvidence">{entries.map(({category,entry})=><article key={category.id} className={`profileCard cat-${category.id}`}><header><div><span>{category.label} · Tier {entry.tier}</span><h3>{entry.subject}</h3><p>{entry.tierLabel}</p></div><RankPill rank={entry.rank}/></header><EvidenceBody entry={entry} category={category.id}/></article>)}</div>
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

function Markets({openTeam}:{openTeam:(abbr:string)=>void}) {
  const [conference,setConference] = useState<'All'|'AFC'|'NFC'>('All');
  const visible = teams.filter(t=>conference==='All'||t.conference===conference).sort((a,b)=>a.conference.localeCompare(b.conference)||a.division.localeCompare(b.division)||markets[a.abbr].marketRank-markets[b.abbr].marketRank);
  const groups = Object.groupBy(visible,t=>`${t.conference} ${t.division}`);
  const visibleTotals = winAggregates.divisions.filter(total=>conference==='All'||total.conference===conference);
  return <section className="reportShell">
    <SectionIntro kicker="Market expectations" title="Complete market curves, team by team." copy="Kalshi supplies all 17 win tails for every club. Those monotone curves drive the expected-win order, exact-win densities and conference/division totals; the sportsbook board appears only where it powers the separate cross-market scan." />
    <div className="marketHero"><div><strong>{marketAudit.current_season_markets}</strong><span>open Kalshi win contracts</span></div><div><strong>{marketAudit.teams_with_all_17_tails}</strong><span>complete 17-tail team ladders</span></div><div><strong>{marketAudit.candidates_passing_filters}</strong><span>pre-fee scan candidates</span></div><a href={kalshiMarketSource.url} target="_blank" rel="noreferrer">Kalshi API ↗</a></div>
    <div className="marketMeta"><p><strong>Snapshots:</strong> sportsbooks {marketSource.retrieved}; Kalshi {kalshiMarketSource.retrieved}. The authenticated connection was verified read-only; no account response was retained. Prices can move after capture.</p><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="marketAudit"><span><b>{marketAudit.raw_midpoint_monotonicity_violations}</b> raw midpoint violations</span><span><b>{marketAudit.isotonic_midpoint_points_adjusted}</b> points isotonic-adjusted</span><span><b>{marketAudit.all_curves_monotone_after?'PASS':'REVIEW'}</b> monotone audit</span><span><b>17 / 17</b> tails for every team</span></div>
    <div className="aggregateBlock"><header><div><span>Total wins by group</span><h3>Distribution-based midpoint totals</h3></div><p>Brackets sum the monotone bid and ask curves. They are market-width bounds, not confidence intervals or joint portfolio guarantees.</p></header><div className="conferenceTotals"><article><span>League</span><strong>{wins(winAggregates.league.midpoint_estimate)}</strong><small>{wins(winAggregates.league.bid_bound)}–{wins(winAggregates.league.ask_bound)} · 272-game ceiling</small></article>{winAggregates.conferences.map(total=><article key={total.conference}><span>{total.conference}</span><strong>{wins(total.midpoint_estimate)}</strong><small>{wins(total.bid_bound)}–{wins(total.ask_bound)} · {total.team_count} teams</small></article>)}</div><div className="divisionTotals">{visibleTotals.map(total=><article key={total.label}><span>{total.label}</span><strong>{wins(total.midpoint_estimate)}</strong><small>{wins(total.bid_bound)}–{wins(total.ask_bound)}</small></article>)}</div></div>
    <div className="edgeBoard"><header><div><span>Cross-market scanner</span><h3>Executable asks below the paired sportsbook probability</h3></div><p>Minimum 5¢ pre-fee edge, maximum 12¢ Kalshi spread and available top-of-book size. These are timestamped research candidates, not recommendations.</p></header><div className="edgeTable"><div className="edgeHead"><span>Team</span><span>Contract</span><span>Sportsbook p</span><span>Kalshi ask</span><span>Pre-fee edge</span><span>Spread</span><span>Top size</span></div>{betCandidates.map(candidate=><a className="edgeRow" href={`https://external-api.kalshi.com/trade-api/v2/markets/${candidate.kalshi_ticker}`} target="_blank" rel="noreferrer" key={`${candidate.kalshi_ticker}-${candidate.side}`}><b>{candidate.team}</b><span>{candidate.contract}</span><span>{percent(candidate.sportsbook_probability)}</span><span>{percent(candidate.kalshi_ask)}</span><strong>+{candidate.pre_fee_edge_cents.toFixed(2)}¢</strong><span>{(candidate.kalshi_spread*100).toFixed(0)}¢</span><span>{candidate.available_size?.toLocaleString()??'—'}</span></a>)}</div></div>
    <div className="divisionGrid">{Object.entries(groups).map(([group,clubs])=>{const total=winAggregates.divisions.find(item=>item.label===group);return <article className="divisionCard" key={group} tabIndex={0} aria-label={`${group} win market table; scroll horizontally for all columns`}><header><span>{group.split(' ')[0]}</span><h3>{group.split(' ')[1]}</h3><small>{total ? `${wins(total.midpoint_estimate)} modeled wins` : ''}</small></header><div className="marketTable"><div className="marketHead"><span>Team</span><span>Kalshi E[W]</span><span>Bid–ask E[W]</span><span>K rank</span><span>Most likely</span><span>Peak p</span><span>Avg. spread</span><span>Coverage</span><span>Profile</span></div>{clubs!.map((t:Team)=>{const market=markets[t.abbr];return <div className="marketRow" key={t.abbr}><span><b>{t.abbr}</b>{t.name}<small>Action input average {compositeFor(t.abbr).toFixed(2)}</small></span><strong>{market.expectedWins.toFixed(2)}</strong><span>{market.expectedWinsBid.toFixed(1)}–{market.expectedWinsAsk.toFixed(1)}</span><span><b>#{market.marketRank}</b></span><span><b>{market.modeWins} wins</b></span><span>{percent(market.modeProbability)}</span><span>{percent(market.kalshiAverageSpread)}</span><span><b>{market.coverageLabel}</b><small>{market.thresholdCount} / 17 tails</small></span><button className="profileJump" onClick={()=>openTeam(t.abbr)}>Density →</button></div>})}</div></article>})}</div>
    <div className="disclaimer"><strong>What is—and is not—estimated</strong><p>Each profile’s exact-win density is the difference between adjacent monotone Kalshi tail midpoints. Kalshi E[W] is their probability-weighted mean, not a directly quoted expected-win contract. The aggregate range sums marginal bid/ask curves; sportsbook de-vigging is retained only for the timestamped scanner, whose edges exclude fees and slippage.</p></div>
  </section>;
}

function Synthesis({openTeam}:{openTeam:(abbr:string)=>void}) {
  const profiles = teams.map(t=>{const ranks=categories.map(c=>evidenceByCategory[c.id][t.abbr].rank);return {t,avg:compositeFor(t.abbr),best:Math.min(...ranks),worst:Math.max(...ranks),spread:Math.max(...ranks)-Math.min(...ranks),marketRank:marketOrder[t.abbr]};});
  const polarized=[...profiles].sort((a,b)=>b.spread-a.spread).slice(0,8);
  const supportGap=[...profiles].sort((a,b)=>(a.avg-a.marketRank)-(b.avg-b.marketRank)).slice(0,6);
  return <section className="reportShell">
    <SectionIntro kicker="Cross-category synthesis" title="Where the inputs reinforce—and contradict—one another." copy="This layer keeps source opinion separate from derived analysis. It uses exact Action category ranks and Kalshi's complete-ladder modeled expected-win order; defense, schedule and injuries remain missing." />
    <div className="synthesisLead"><h3>The strongest early signal is structure, not stardom.</h3><p>Los Angeles, San Francisco and Chicago rank well because advantages repeat across categories. Cincinnati and Buffalo are more fragile: elite quarterback value has to overcome a weak or uncertain part of the organizational stack. That is exactly the sort of disagreement worth monitoring as defense is added.</p></div>
    <div className="synthesisGrid"><article><div className="eyebrow">Most polarized profiles</div><h3>One ranking cannot describe these teams.</h3><div className="polarList">{polarized.map(p=><button key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><b>{p.t.abbr}</b><span><i style={{left:`${(p.best-1)/31*100}%`,right:`${100-(p.worst-1)/31*100}%`}}/></span><small>#{p.best} → #{p.worst}</small></button>)}</div></article><article><div className="eyebrow">Action inputs stronger than Kalshi expected-win rank</div><h3>Disagreements for further research.</h3>{supportGap.map(p=><button className="gapRow" key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><span>{p.t.name}</span><b>Action avg. {p.avg.toFixed(2)}</b><em>Kalshi rank #{p.marketRank}</em></button>)}<p className="fineprint">This means only that the equal-weight Action input rank is better than the complete-ladder Kalshi midpoint rank. It is not a bet recommendation: defense, schedule, injuries and interactions between units are absent, while bid/ask width and fees still matter.</p></article></div>
    <div className="thesisGrid"><article><span>Coaching as multiplier</span><h3>SF · LAR · CHI · LAC</h3><p>The top four staffs all have a specific mechanism for making other units better: play design, organization, protection/run answers or defensive structure.</p></article><article><span>Stars versus weak links</span><h3>CIN · BUF · GB</h3><p>These teams expose the project’s central tension. A top quarterback can erase problems—until coaching, line health or pass-catcher depth creates the one failure the opponent can target.</p></article><article><span>Regression pressure</span><h3>SEA · MIN · DEN</h3><p>Close-game records, lead-heavy game scripts and unusually healthy or efficient stretches are repeatedly flagged as things that may not repeat.</p></article><article><span>Aligned warning</span><h3>MIA · CLE · TEN</h3><p>Multiple independent categories agree. Without a defensive surprise, the current evidence offers very few ways for these teams to beat low market expectations.</p></article></div>
    <div className="nextLayer"><strong>Designed for the defensive episode</strong><p>The data model accepts another exact 1–32 category without changing the team dossiers or source audit. Once defense lands, the composite will move from four inputs to five and the market-gap view will become materially more useful.</p></div>
  </section>;
}

function Sources() {
  const hashes:Record<CategoryId,string>={qb:'4599cad…0ec85c',coaching:'77504bab…9af7cb5',ol:'b97f5c4a…40c2c0',skill:'0f8ea7ff…1b891be'};
  const lineCounts:Record<CategoryId,number>={qb:2410,coaching:2785,ol:2680,skill:2743};
  return <section className="reportShell">
    <SectionIntro kicker="Provenance & completeness" title="Built so omissions and interpretation can be audited." copy="The four source transcripts were acquired read-only, snapshotted privately and hashed before extraction. The public artifact retains publisher links and checksums without exposing private-library identifiers or raw copyrighted text." />
    <div className="qaBanner"><strong>PASS</strong><div><h3>128 expected ranks · 128 represented · 0 duplicates · 0 missing teams</h3><p>Every category contains each NFL team exactly once, in a complete 1–32 order.</p></div></div>
    <div className="sourceGrid">{categories.map(c=>{const m=sourceMeta[c.id];return <article key={c.id}><span>{c.short}</span><h3>{m.label}</h3><dl><div><dt>Words</dt><dd>{m.words.toLocaleString()}</dd></div><div><dt>Lines</dt><dd>{lineCounts[c.id].toLocaleString()}</dd></div><div><dt>SHA-256</dt><dd>{hashes[c.id]}</dd></div><div><dt>Coverage</dt><dd>32 / 32</dd></div></dl><div><a href={m.source} target="_blank" rel="noreferrer">Publisher transcript ↗</a></div></article>})}</div>
    <div className="methodPanel"><article><div className="eyebrow">Extraction contract</div><h3>Substance preserved; filler removed.</h3><ol><li>Lock the corpus and hashes before interpretation.</li><li>Reconcile the spoken 1–32 order against all 32 team identities.</li><li>Store each substantive positive, concern, qualifier, comparison, named person and methodological rule.</li><li>Keep source opinion separate from report-derived synthesis.</li><li>Attach every team-category entry to a transcript line range.</li></ol></article><article><div className="eyebrow">Known audit exceptions</div><h3>Transcription ambiguity is disclosed, never silently repaired.</h3><ul><li>QB: one garbled Jordan Love rate claim is described but not reconstructed.</li><li>OL: “Keelan Rutledge” may be a transcript error; the source wording is preserved.</li><li>Skill: “Caslat” is cautiously normalized to Isaac TeSlaa; Cleveland’s second rookie is treated as Harold Fannin Jr.; one Saints backfield name is omitted rather than guessed.</li><li>Coaching Reader metadata carries an implausible 2019 publish date; retrieval IDs and episode content, not that field, determine the edition.</li></ul></article></div>
    <div className="marketSource"><div><span>Sportsbook source</span><h3>{marketSource.label}</h3><p>{marketSource.note}</p><small>{marketSource.updated} · captured {marketSource.retrieved} · 32/32 paired primary quotes · {sportsbookMarketAudit.teams_with_multiple_thresholds} multi-threshold teams</small></div><a href={marketSource.url} target="_blank" rel="noreferrer">Open current board ↗</a></div>
    <div className="marketSource"><div><span>Prediction-market source</span><h3>{kalshiMarketSource.label}</h3><p>All 17 win thresholds for all 32 teams. Authentication was verified read-only; no account payload or credential was retained.</p><small>captured {kalshiMarketSource.retrieved} · 544 open contracts · 32/32 complete ladders · midpoint expected wins labeled as modeled</small></div><a href={kalshiMarketSource.documentation} target="_blank" rel="noreferrer">API method ↗</a></div>
    <div className="versionNote"><strong>Edition 3 · Aug. 23, 2026</strong><span>Four offensive/organizational episodes, paired de-vigged sportsbook prices and complete Kalshi win-tail ladders. Defense is pending. Market snapshots remain append-only.</span></div>
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
    <header className="masthead"><div className="eyebrow">2026 NFL Outlook Field Guide</div><div className="mastheadRow"><div><h1>The shape of every team</h1><p className="deck">Four Action Network rankings, one evidence-first view of the league.</p></div><div className="edition"><span>Preseason · edition 3</span><strong>Data through Aug. 23</strong></div></div></header>
    <nav className="tabRail" aria-label="Report sections">{tabs.map(t=><button className={tab===t.id?'active':''} key={t.id} onClick={()=>go(t.id)} type="button">{t.label}</button>)}</nav>
    {tab==='briefing'&&<Briefing go={go}/>} {tab==='matrix'&&<Matrix openTeam={openTeam}/>} {tab==='teams'&&<TeamProfiles selected={selectedTeam} setSelected={setSelectedTeam}/>} {(['qb','coaching','ol','skill'] as CategoryId[]).includes(tab as CategoryId)&&<CategoryView id={tab as CategoryId}/>} {tab==='markets'&&<Markets openTeam={openTeam}/>} {tab==='synthesis'&&<Synthesis openTeam={openTeam}/>} {tab==='sources'&&<Sources/>}
    <footer><span>2026 NFL Outlook Field Guide</span><p>Source opinion: Action Network podcast transcripts. Derived synthesis: Field Guide analysis. Betting markets move; verify before acting.</p><button onClick={()=>go('sources')}>Methods & sources</button></footer>
  </main>;
}
