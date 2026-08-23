'use client';

import { useEffect, useMemo, useState } from 'react';
import { categories, CategoryId, claimCount, compositeFor, evidenceByCategory, marketAudit, markets, marketSource, sourceMeta, teams, type Evidence, type Team } from './data';

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
    <div className="controls"><label>Find a team<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or abbreviation" /></label><label>Order by<select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="composite">Partial composite</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}<option value="market">Price-adjusted market rank</option></select></label><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="legend"><span><i className="elite"/>1–8</span><span><i className="good"/>9–16</span><span><i className="warn"/>17–24</span><span><i className="poor"/>25–32</span><em>Lower = stronger</em></div>
    <div className="matrixCard full"><div className="matrixHead matrixGrid"><span>Team</span>{categories.map(c=><button onClick={()=>setSort(c.id)} key={c.id}>{c.short}</button>)}<button onClick={()=>setSort('composite')}>Avg.</button><button onClick={()=>setSort('market')}>Mkt.</button></div>{rows.map(t=><button className="matrixRow matrixGrid" key={t.abbr} onClick={()=>openTeam(t.abbr)}><div className="teamCell"><span className="teamBadge">{t.abbr}</span><div><strong>{t.name}</strong><small>{t.conference} {t.division}</small></div></div>{categories.map(c=><RankPill key={c.id} rank={evidenceByCategory[c.id][t.abbr].rank}/>) }<strong className="composite">{compositeFor(t.abbr).toFixed(2)}</strong><span className="marketMini" title={`Price-adjusted market rank; posted line ${markets[t.abbr].line}`}>#{markets[t.abbr].marketRank}</span></button>)}</div>
  </section>;
}

function TeamProfiles({selected,setSelected}:{selected:string;setSelected:(v:string)=>void}) {
  const team = teamByAbbr[selected];
  const entries = categories.map(c=>({category:c,entry:evidenceByCategory[c.id][selected]}));
  const spread = Math.max(...entries.map(x=>x.entry.rank))-Math.min(...entries.map(x=>x.entry.rank));
  return <section className="reportShell">
    <SectionIntro kicker="Team dossier" title="Every retained argument, team by team." copy="Choose any club to see all four exact ranks, every named person, the case for, the concerns, context and the transcript locator." />
    <div className="teamPicker"><label>Team<select value={selected} onChange={e=>setSelected(e.target.value)}>{[...teams].sort((a,b)=>a.name.localeCompare(b.name)).map(t=><option value={t.abbr} key={t.abbr}>{t.name}</option>)}</select></label><div className="teamIdentity"><span>{team.abbr}</span><div><h3>{team.name}</h3><p>{team.conference} {team.division} · Market {markets[selected].line}, no-vig Over {percent(markets[selected].noVigOver)} · Action input average {compositeFor(selected).toFixed(2)}</p></div></div><div className="variance"><strong>{spread}</strong><span>rank-position spread</span></div></div>
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

function Markets() {
  const [conference,setConference] = useState<'All'|'AFC'|'NFC'>('All');
  const visible = teams.filter(t=>conference==='All'||t.conference===conference).sort((a,b)=>a.conference.localeCompare(b.conference)||a.division.localeCompare(b.division)||markets[a.abbr].marketRank-markets[b.abbr].marketRank);
  const groups = Object.groupBy(visible,t=>`${t.conference} ${t.division}`);
  return <section className="reportShell">
    <SectionIntro kicker="Market expectations" title="Paired prices, de-vigged." copy="Every displayed probability starts with an Over and Under from the same book. Quotes at the same threshold are de-vigged independently and combined by median; sparse coverage is not stretched into false expected-win precision." />
    <div className="marketHero"><div><strong>{marketAudit.teams_with_paired_primary_quote}</strong><span>teams with paired primary quotes</span></div><div><strong>{marketAudit.teams_with_multiple_thresholds}</strong><span>teams with more than one threshold</span></div><div><strong>{marketAudit.teams_with_full_expected_win_coverage}</strong><span>teams cleared for expected wins</span></div><a href={marketSource.url} target="_blank" rel="noreferrer">Current board ↗</a></div>
    <div className="marketMeta"><p><strong>Source:</strong> {marketSource.label}. Captured {marketSource.retrieved}. {marketSource.updated}. Prices can move after capture.</p><div className="segmented">{(['All','AFC','NFC'] as const).map(c=><button className={conference===c?'active':''} onClick={()=>setConference(c)} key={c}>{c}</button>)}</div></div>
    <div className="marketAudit"><span><b>{marketAudit.monotonicity_violations_before}</b> raw curve violations</span><span><b>{marketAudit.monotonicity_points_adjusted}</b> points isotonic-adjusted</span><span><b>{marketAudit.all_curves_monotone_after?'PASS':'REVIEW'}</b> monotone audit</span><span><b>Median only</b> expected-win gate</span></div>
    <div className="divisionGrid">{Object.entries(groups).map(([group,clubs])=><article className="divisionCard" key={group}><header><span>{group.split(' ')[0]}</span><h3>{group.split(' ')[1]}</h3></header><div className="marketTable"><div className="marketHead"><span>Team</span><span>Line</span><span>Paired O / U</span><span>Hold</span><span>No-vig Over</span><span>50% bound</span><span>E[W]</span><span>Coverage</span><span>Action avg. rank</span></div>{clubs!.map((t:Team)=>{const market=markets[t.abbr];return <div className="marketRow" key={t.abbr}><span><b>{t.abbr}</b>{t.name}<small>Market rank #{market.marketRank}</small></span><strong>{market.line}</strong><span><b>{market.over} / {market.under}</b><small>{market.book}</small></span><span>{percent(market.hold)}</span><span><b>{percent(market.noVigOver)}</b><small>{market.pairedQuoteCount} paired quotes</small></span><span>{market.medianBracket}</span><span title="Expected wins are withheld because the observed ladder is incomplete.">{market.expectedWins??'—'}</span><span><b>{market.coverageLabel}</b><small>{market.thresholdCount} / 17 tails · {market.confidence}</small></span><em>{compositeFor(t.abbr).toFixed(2)}</em></div>})}</div></article>)}</div>
    <div className="disclaimer"><strong>What is—and is not—estimated</strong><p>The price-adjusted market order uses the posted half-win line plus its no-vig Over probability only as an ordinal score. It is not an expected-win forecast. No team has enough observed tail thresholds for the 17-term tail-sum calculation, so E[W] is intentionally blank and the report shows only observed 50% bounds. Nineteen teams have two cross-book thresholds; no source exposed a full same-book alternate ladder.</p></div>
  </section>;
}

function Synthesis({openTeam}:{openTeam:(abbr:string)=>void}) {
  const profiles = teams.map(t=>{const ranks=categories.map(c=>evidenceByCategory[c.id][t.abbr].rank);return {t,avg:compositeFor(t.abbr),best:Math.min(...ranks),worst:Math.max(...ranks),spread:Math.max(...ranks)-Math.min(...ranks),marketRank:marketOrder[t.abbr]};});
  const polarized=[...profiles].sort((a,b)=>b.spread-a.spread).slice(0,8);
  const supportGap=[...profiles].sort((a,b)=>(a.avg-a.marketRank)-(b.avg-b.marketRank)).slice(0,6);
  return <section className="reportShell">
    <SectionIntro kicker="Cross-category synthesis" title="Where the inputs reinforce—and contradict—one another." copy="This layer keeps source opinion separate from derived analysis. It uses exact Action category ranks and a de-vigged price-adjusted market order; defense, schedule, injuries and full alternate ladders remain missing." />
    <div className="synthesisLead"><h3>The strongest early signal is structure, not stardom.</h3><p>Los Angeles, San Francisco and Chicago rank well because advantages repeat across categories. Cincinnati and Buffalo are more fragile: elite quarterback value has to overcome a weak or uncertain part of the organizational stack. That is exactly the sort of disagreement worth monitoring as defense is added.</p></div>
    <div className="synthesisGrid"><article><div className="eyebrow">Most polarized profiles</div><h3>One ranking cannot describe these teams.</h3><div className="polarList">{polarized.map(p=><button key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><b>{p.t.abbr}</b><span><i style={{left:`${(p.best-1)/31*100}%`,right:`${100-(p.worst-1)/31*100}%`}}/></span><small>#{p.best} → #{p.worst}</small></button>)}</div></article><article><div className="eyebrow">Action inputs stronger than price-adjusted market rank</div><h3>Disagreements for further research.</h3>{supportGap.map(p=><button className="gapRow" key={p.t.abbr} onClick={()=>openTeam(p.t.abbr)}><span>{p.t.name}</span><b>Action avg. {p.avg.toFixed(2)}</b><em>Market rank #{p.marketRank}</em></button>)}<p className="fineprint">This means only that the equal-weight Action input rank is better than the de-vigged price-adjusted market expectation rank. It is not a bet recommendation: defense, schedule, injuries and interactions between units are absent, and sparse price coverage does not support expected wins.</p></article></div>
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
    <div className="marketSource"><div><span>Market source</span><h3>{marketSource.label}</h3><p>{marketSource.note}</p><small>{marketSource.updated} · captured {marketSource.retrieved} · 32/32 paired primary quotes · {marketAudit.teams_with_multiple_thresholds} multi-threshold teams · expected wins withheld for all teams</small></div><a href={marketSource.url} target="_blank" rel="noreferrer">Open current board ↗</a></div>
    <div className="versionNote"><strong>Edition 2 · Aug. 23, 2026</strong><span>Four offensive/organizational episodes plus de-vigged paired win-total prices. Defense is pending. The report architecture and market snapshots are append-only so future editions can show content and price movement.</span></div>
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
    <header className="masthead"><div className="eyebrow">2026 NFL Outlook Field Guide</div><div className="mastheadRow"><div><h1>The shape of every team</h1><p className="deck">Four Action Network rankings, one evidence-first view of the league.</p></div><div className="edition"><span>Preseason · edition 2</span><strong>Data through Aug. 23</strong></div></div></header>
    <nav className="tabRail" aria-label="Report sections">{tabs.map(t=><button className={tab===t.id?'active':''} key={t.id} onClick={()=>go(t.id)} type="button">{t.label}</button>)}</nav>
    {tab==='briefing'&&<Briefing go={go}/>} {tab==='matrix'&&<Matrix openTeam={openTeam}/>} {tab==='teams'&&<TeamProfiles selected={selectedTeam} setSelected={setSelectedTeam}/>} {(['qb','coaching','ol','skill'] as CategoryId[]).includes(tab as CategoryId)&&<CategoryView id={tab as CategoryId}/>} {tab==='markets'&&<Markets/>} {tab==='synthesis'&&<Synthesis openTeam={openTeam}/>} {tab==='sources'&&<Sources/>}
    <footer><span>2026 NFL Outlook Field Guide</span><p>Source opinion: Action Network podcast transcripts. Derived synthesis: Field Guide analysis. Betting markets move; verify before acting.</p><button onClick={()=>go('sources')}>Methods & sources</button></footer>
  </main>;
}
