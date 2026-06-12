import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────
const API_BASE = "https://wc2026-backend-production-3745.up.railway.app";
// ─────────────────────────────────────────────────────────────────

const fmt = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";
const fmtOdds = (n) => n != null ? Number(n).toFixed(2) : "—";

const VERDICT_STYLE = {
  BET:      { color: "#00ff87", bg: "rgba(0,255,135,0.1)",  border: "rgba(0,255,135,0.3)" },
  "NO BET": { color: "#ff4b4b", bg: "rgba(255,75,75,0.08)", border: "rgba(255,75,75,0.3)" },
  WATCH:    { color: "#ffd700", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.3)" },
};
const RISK_COLOR = { LOW: "#00ff87", MEDIUM: "#ffd700", HIGH: "#ff4b4b" };

const SPORTS = {
  nrl: {
    label: "NRL",
    emoji: "🏉",
    color: "#ff6b00",
    picksUrl:   "/nrl/picks",
    title:      "NRL AI PICKS",
    subtitle:   "RUGBY LEAGUE · AU MARKETS",
  },
  wc: {
    label: "WORLD CUP",
    emoji: "⚽",
    color: "#00ff87",
    picksUrl:   "/picks",
    title:      "WC 2026 AI PICKS",
    subtitle:   "FIFA WORLD CUP · AU MARKETS",
  },
};

// ─── MOCK DATA ────────────────────────────────────────────────────
const MOCK_NRL = [
  {
    verdict: "BET", confidence: 74, risk: "MEDIUM", sport: "nrl",
    primaryBet: "Panthers to Win", market: "Head to Head",
    recommendedOdds: 1.72, kellyStake: 38.00,
    edge: "Panthers' superior points differential and home record gives clear value at current odds.",
    prediction: "Panthers 22-14 Broncos", trueProbability: 65, impliedProbability: 58,
    keyFactors: ["Panthers unbeaten at home in last 7", "Broncos missing key halves", "Panthers avg +12 pts differential"],
    concerns: ["Broncos strong away record", "Panthers rotation risk"],
    reasoning: "The Panthers' home fortress and points differential data shows genuine value in their H2H price. Broncos have struggled to score against top-4 defences this season — the stats back Panthers here.",
    alternativeBet: "Panthers -6.5 Handicap @ 1.90",
    odds: { home: 1.72, away: 2.10, bookmaker: "Sportsbet" },
    match: { home: "Panthers", away: "Broncos", date: new Date(Date.now() + 86400000*2).toISOString(), venue: "BlueBet Stadium", round: "Round 15" },
    analysedAt: new Date().toISOString()
  },
  {
    verdict: "WATCH", confidence: 52, risk: "HIGH", sport: "nrl",
    primaryBet: "Over 42.5 Total Points", market: "Total Points",
    recommendedOdds: 1.85, kellyStake: 0,
    edge: "Both sides average 44+ pts combined but inconsistent scoring makes this borderline.",
    prediction: "Storm 20-18 Roosters", trueProbability: 50, impliedProbability: 54,
    keyFactors: ["Both teams avg 22+ pts/game", "Historically high-scoring fixture", "No defensive injuries confirmed"],
    concerns: ["Storm known to control tempo", "Roosters can grind low scores"],
    reasoning: "Historical data shows this fixture averages 44 combined points. However Storm's game style often pushes scoring lower in finals-style pressure games. Monitor team announcements.",
    alternativeBet: "Storm to Win @ 1.55",
    odds: { home: 1.55, away: 2.50, bookmaker: "TAB" },
    match: { home: "Storm", away: "Roosters", date: new Date(Date.now() + 86400000*3).toISOString(), venue: "AAMI Park", round: "Round 15" },
    analysedAt: new Date().toISOString()
  }
];

const MOCK_WC = [
  {
    verdict: "BET", confidence: 78, risk: "MEDIUM", sport: "wc",
    primaryBet: "France to Win", market: "Match Result",
    recommendedOdds: 1.85, kellyStake: 42.50,
    edge: "France's superior squad depth and tournament record gives clear value at these odds.",
    prediction: "France 2-1 Germany", trueProbability: 62, impliedProbability: 54,
    keyFactors: ["France unbeaten in last 8 tournament games", "Germany missing key midfielder", "Historical H2H favours France in tournaments"],
    concerns: ["Germany's strong home-equivalent support", "France's slow tournament starts historically"],
    reasoning: "France enter as clear statistical favourites with a fully fit squad. Germany's midfield absence is significant and odds haven't fully adjusted for this. Value is clear at 1.85.",
    alternativeBet: "Both Teams to Score @ 1.72",
    odds: { home: 1.85, draw: 3.40, away: 4.20, bookmaker: "Sportsbet" },
    match: { home: "France", away: "Germany", date: "2026-06-19T19:00:00", venue: "MetLife Stadium, NY" },
    analysedAt: new Date().toISOString()
  }
];

const MOCK_RESULTS = {
  results: [], total_profit: 0, win_rate: 0, roi: 0
};

// ─── COMPONENTS ──────────────────────────────────────────────────

function Pill({ label, color, bg, border }) {
  return (
    <span style={{
      padding: "3px 10px", fontSize: 10, letterSpacing: 2, fontWeight: "bold",
      color, background: bg, border: `1px solid ${border}`, borderRadius: 2
    }}>{label}</span>
  );
}

function ConfidenceBar({ value, color }) {
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width 1s ease" }} />
    </div>
  );
}

function PickCard({ pick, onResult, sport }) {
  const [expanded, setExpanded] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const vs = VERDICT_STYLE[pick.verdict] || VERDICT_STYLE["WATCH"];
  const matchDate = new Date(pick.match?.date);
  const timeStr = matchDate.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const isNRL = sport === "nrl";

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: `1px solid ${vs.border}`,
      borderRadius: 4, overflow: "hidden", marginBottom: 12,
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", marginBottom: 3 }}>
              {timeStr}{isNRL && pick.match?.round ? ` · ${pick.match.round}` : ""}
            </div>
            <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>
              {isNRL ? "🏉" : "⚽"} {pick.match?.home} <span style={{ color: "#333" }}>vs</span> {pick.match?.away}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>📍 {pick.match?.venue}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Pill label={pick.verdict} color={vs.color} bg={vs.bg} border={vs.border} />
            <div style={{ fontSize: 22, fontWeight: "bold", color: vs.color, marginTop: 6 }}>{pick.confidence}%</div>
          </div>
        </div>

        <ConfidenceBar value={pick.confidence} color={vs.color} />

        {pick.verdict === "BET" && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: vs.bg, borderRadius: 3 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: vs.color, marginBottom: 4 }}>PRIMARY BET</div>
            <div style={{ fontSize: 14, fontWeight: "bold" }}>{pick.primaryBet}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
              <span>Odds: <strong style={{ color: "#fff" }}>{fmtOdds(pick.recommendedOdds)}</strong></span>
              <span>Kelly Stake: <strong style={{ color: vs.color }}>{fmt(pick.kellyStake)} AUD</strong></span>
              <span>Via: <strong style={{ color: "#fff" }}>{pick.odds?.bookmaker || "Best book"}</strong></span>
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, color: "#333", marginTop: 8, textAlign: "right" }}>
          {expanded ? "▲ less" : "▼ full analysis"}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Odds */}
          <div style={{ display: "grid", gridTemplateColumns: isNRL ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, margin: "16px 0" }}>
            {isNRL
              ? [
                  { label: pick.match?.home, val: pick.odds?.home },
                  { label: pick.match?.away, val: pick.odds?.away },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 3 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#555", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: "bold" }}>{fmtOdds(val)}</div>
                  </div>
                ))
              : [
                  { label: pick.match?.home, val: pick.odds?.home },
                  { label: "DRAW", val: pick.odds?.draw },
                  { label: pick.match?.away, val: pick.odds?.away },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 3 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#555", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: "bold" }}>{fmtOdds(val)}</div>
                  </div>
                ))
            }
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#555", marginBottom: 6 }}>BETTING EDGE</div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>{pick.edge}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ff87", marginBottom: 8 }}>FOR</div>
              {pick.keyFactors?.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 5, display: "flex", gap: 6 }}>
                  <span style={{ color: "#00ff87" }}>+</span>{f}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#ff4b4b", marginBottom: 8 }}>AGAINST</div>
              {pick.concerns?.map((c, i) => (
                <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 5, display: "flex", gap: 6 }}>
                  <span style={{ color: "#ff4b4b" }}>−</span>{c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid #222", marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#444", marginBottom: 6 }}>AI REASONING · DATA ONLY</div>
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.8 }}>{pick.reasoning}</div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#555", marginBottom: 4 }}>PREDICTION</div>
              <div style={{ fontSize: 13, fontWeight: "bold" }}>{pick.prediction}</div>
            </div>
            <div style={{ flex: 1, padding: "10px", background: "rgba(255,215,0,0.05)", borderRadius: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#ffd700", marginBottom: 4 }}>ALTERNATIVE</div>
              <div style={{ fontSize: 12 }}>{pick.alternativeBet}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#444" }}>RISK:</div>
            <Pill label={pick.risk} color={RISK_COLOR[pick.risk]} bg="transparent" border={RISK_COLOR[pick.risk] + "44"} />
          </div>

          {pick.verdict === "BET" && !showResult && (
            <button onClick={() => setShowResult(true)} style={{
              width: "100%", padding: "10px", fontSize: 11, letterSpacing: 3,
              background: "transparent", color: vs.color, border: `1px solid ${vs.border}`,
              cursor: "pointer", fontFamily: "inherit"
            }}>RECORD RESULT →</button>
          )}

          {showResult && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onResult(pick, true); setShowResult(false); }} style={{
                flex: 1, padding: "10px", fontSize: 11, letterSpacing: 2,
                background: "rgba(0,255,135,0.15)", color: "#00ff87",
                border: "1px solid rgba(0,255,135,0.3)", cursor: "pointer", fontFamily: "inherit"
              }}>✓ WON</button>
              <button onClick={() => { onResult(pick, false); setShowResult(false); }} style={{
                flex: 1, padding: "10px", fontSize: 11, letterSpacing: 2,
                background: "rgba(255,75,75,0.1)", color: "#ff4b4b",
                border: "1px solid rgba(255,75,75,0.3)", cursor: "pointer", fontFamily: "inherit"
              }}>✗ LOST</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────

export default function App() {
  const [sport, setSport]           = useState("nrl");
  const [tab, setTab]               = useState("picks");
  const [picks, setPicks]           = useState({ nrl: MOCK_NRL, wc: MOCK_WC });
  const [results, setResults]       = useState(MOCK_RESULTS);
  const [bankroll, setBankroll]     = useState({ starting: 1000, current: 1000, currency: "AUD" });
  const [lastUpdated, setLastUpdated] = useState({ nrl: null, wc: null });
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected]   = useState(false);
  const [bankrollInput, setBankrollInput] = useState("1000");
  const [filter, setFilter]         = useState("ALL");

  const sp = SPORTS[sport];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nrlRes, wcRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/nrl/picks`),
        fetch(`${API_BASE}/picks`),
        fetch(`${API_BASE}/results`),
      ]);
      const nrlData     = await nrlRes.json();
      const wcData      = await wcRes.json();
      const resultsData = await resultsRes.json();

      setPicks({ nrl: nrlData.picks || [], wc: wcData.picks || [] });
      setBankroll(nrlData.bankroll);
      setLastUpdated({ nrl: nrlData.last_updated, wc: wcData.last_updated });
      setResults(resultsData);
      setConnected(true);
    } catch (e) {
      console.log("Using demo data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResult = async (pick, won) => {
    const payload = {
      match: `${pick.match.home} vs ${pick.match.away}`,
      bet:   pick.primaryBet,
      odds:  pick.recommendedOdds,
      stake: pick.kellyStake,
      sport: pick.sport || sport,
      won
    };
    if (connected) {
      await fetch(`${API_BASE}/result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      fetchData();
    } else {
      const profit = won ? payload.stake * (payload.odds - 1) : -payload.stake;
      setResults(prev => ({
        ...prev,
        results: [...(prev.results || []), { ...payload, profit }],
        total_profit: (prev.total_profit || 0) + profit,
      }));
      setBankroll(prev => ({ ...prev, current: prev.current + profit }));
    }
  };

  const triggerRefresh = async () => {
    if (!connected || refreshing) return;
    setRefreshing(true);
    await fetch(`${API_BASE}/refresh`, { method: "POST" });
    // Poll until last_updated changes
    const prevUpdated = lastUpdated[sport];
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const res = await fetch(`${API_BASE}/${sport === "nrl" ? "nrl/" : ""}picks`).then(r => r.json());
      if (res.last_updated !== prevUpdated || attempts > 24) {
        clearInterval(poll);
        await fetchData();
        setRefreshing(false);
      }
    }, 5000);
  };

  const setBankrollAmount = async () => {
    const amount = parseFloat(bankrollInput);
    if (isNaN(amount)) return;
    if (connected) {
      await fetch(`${API_BASE}/bankroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
      fetchData();
    } else {
      setBankroll({ starting: amount, current: amount, currency: "AUD" });
    }
  };

  const currentPicks   = picks[sport] || [];
  const filteredPicks  = filter === "ALL" ? currentPicks : currentPicks.filter(p => p.verdict === filter);
  const betPicks       = currentPicks.filter(p => p.verdict === "BET").sort((a,b) => b.confidence - a.confidence);
  const profitPositive = (results.total_profit || 0) >= 0;
  const accentColor    = sp.color;
  const updated        = lastUpdated[sport];

  return (
    <div style={{
      minHeight: "100vh", maxWidth: 480, margin: "0 auto",
      background: "#060a0f",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e0e0e0",
    }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(6,10,15,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 18px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: accentColor, marginBottom: 2 }}>{sp.subtitle}</div>
            <div style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>{sp.title}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, letterSpacing: 2,
              color: connected ? "#00ff87" : "#ffd700",
              padding: "4px 8px", border: `1px solid ${connected ? "rgba(0,255,135,0.3)" : "rgba(255,215,0,0.3)"}`,
              borderRadius: 2
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "#00ff87" : "#ffd700", display: "inline-block" }} />
              {connected ? "LIVE" : "DEMO"}
            </div>
            {updated && <div style={{ fontSize: 9, color: "#333", marginTop: 3 }}>
              {new Date(updated).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </div>}
          </div>
        </div>

        {/* Sport selector */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {Object.entries(SPORTS).map(([key, s]) => (
            <button key={key} onClick={() => { setSport(key); setFilter("ALL"); }} style={{
              flex: 1, padding: "8px", fontSize: 11, letterSpacing: 2, fontWeight: "bold",
              background: sport === key ? `${s.color}18` : "transparent",
              color: sport === key ? s.color : "#444",
              border: `1px solid ${sport === key ? s.color + "55" : "#222"}`,
              cursor: "pointer", fontFamily: "inherit", borderRadius: 3,
              transition: "all 0.2s"
            }}>{s.emoji} {s.label}</button>
          ))}
        </div>
      </div>

      {/* Bankroll strip */}
      <div style={{
        padding: "12px 18px",
        background: `${accentColor}08`,
        borderBottom: `1px solid ${accentColor}22`,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#555" }}>BANKROLL</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: accentColor }}>
            ${bankroll.current.toFixed(2)} AUD
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#555" }}>P&L</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: profitPositive ? "#00ff87" : "#ff4b4b" }}>
            {profitPositive ? "+" : ""}{fmt(results.total_profit)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#555" }}>WIN RATE</div>
          <div style={{ fontSize: 16, fontWeight: "bold" }}>{results.win_rate || 0}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 114, zIndex: 99,
        background: "rgba(6,10,15,0.97)", backdropFilter: "blur(12px)"
      }}>
        {["picks", "tracker", "settings"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "12px", fontSize: 10, letterSpacing: 3,
            background: "transparent",
            color: tab === t ? accentColor : "#444",
            border: "none",
            borderBottom: `2px solid ${tab === t ? accentColor : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase"
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "18px" }}>

        {/* ── PICKS TAB ── */}
        {tab === "picks" && (
          <div>
            {/* Refresh button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#444" }}>
                {updated ? `UPDATED ${new Date(updated).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} · AUTO 7PM DAILY` : "AUTO-REFRESH 7PM DAILY"}
              </div>
              {connected && (
                <button onClick={triggerRefresh} disabled={refreshing} style={{
                  padding: "6px 14px", fontSize: 10, letterSpacing: 2,
                  background: refreshing ? "rgba(255,255,255,0.03)" : `${accentColor}18`,
                  color: refreshing ? "#444" : accentColor,
                  border: `1px solid ${refreshing ? "#222" : accentColor + "44"}`,
                  cursor: refreshing ? "not-allowed" : "pointer",
                  fontFamily: "inherit", borderRadius: 3,
                }}>
                  {refreshing ? "⟳ REFRESHING..." : "⟳ REFRESH NOW"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
              {["ALL", "BET", "WATCH", "NO BET"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "5px 12px", fontSize: 9, letterSpacing: 2,
                  background: filter === f ? (VERDICT_STYLE[f]?.bg || "rgba(255,255,255,0.1)") : "transparent",
                  color: filter === f ? (VERDICT_STYLE[f]?.color || "#fff") : "#444",
                  border: `1px solid ${filter === f ? (VERDICT_STYLE[f]?.border || "#444") : "#222"}`,
                  cursor: "pointer", fontFamily: "inherit"
                }}>{f} ({f === "ALL" ? currentPicks.length : currentPicks.filter(p=>p.verdict===f).length})</button>
              ))}
            </div>

            {betPicks.length > 0 && filter === "ALL" && (
              <div style={{
                padding: "14px 16px", marginBottom: 18,
                background: `${accentColor}0d`, border: `1px solid ${accentColor}33`,
                borderRadius: 4
              }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: accentColor, marginBottom: 6 }}>⚡ TOP PICK</div>
                <div style={{ fontSize: 15, fontWeight: "bold" }}>
                  {betPicks[0]?.match?.home} vs {betPicks[0]?.match?.away}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {betPicks[0]?.primaryBet} · {betPicks[0]?.confidence}% confidence
                </div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: 40, color: "#333", fontSize: 12, letterSpacing: 3 }}>
                LOADING LIVE DATA...
              </div>
            )}

            {!loading && filteredPicks.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#333", fontSize: 11, letterSpacing: 2, lineHeight: 1.8 }}>
                {sport === "nrl"
                  ? "NO NRL PICKS YET\n\nThe AI is fetching this week's fixtures\nand generating picks. Check back soon."
                  : "NO WC PICKS YET\n\nWorld Cup starts June 11, 2026.\nPicks will appear automatically."}
              </div>
            )}

            {!loading && filteredPicks.map((pick, i) => (
              <PickCard key={i} pick={pick} onResult={handleResult} sport={sport} />
            ))}

            {!connected && (
              <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: "#ffd700", marginBottom: 6 }}>DEMO MODE</div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7 }}>
                  Showing sample picks. Live AI picks are generated automatically every 15 minutes once the backend connects.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRACKER TAB ── */}
        {tab === "tracker" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "TOTAL BETS", value: results.results?.length || 0, color: "#fff" },
                { label: "WIN RATE", value: `${results.win_rate || 0}%`, color: (results.win_rate || 0) >= 50 ? "#00ff87" : "#ff4b4b" },
                { label: "TOTAL P&L", value: fmt(results.total_profit), color: profitPositive ? "#00ff87" : "#ff4b4b" },
                { label: "ROI", value: `${results.roi || 0}%`, color: (results.roi || 0) >= 0 ? "#00ff87" : "#ff4b4b" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "#444", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: "bold", color }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 14 }}>BET HISTORY</div>
            {!results.results?.length && (
              <div style={{ textAlign: "center", padding: 30, color: "#333", fontSize: 11, letterSpacing: 3 }}>
                NO BETS RECORDED YET<br/>
                <span style={{ fontSize: 10, color: "#222" }}>Record results from the PICKS tab</span>
              </div>
            )}
            {results.results?.map((r, i) => (
              <div key={i} style={{
                padding: "12px 14px", marginBottom: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 3, display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>{r.sport === "nrl" ? "🏉 NRL" : "⚽ WC"}</div>
                  <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>{r.match}</div>
                  <div style={{ fontSize: 10, color: "#555" }}>{r.bet} · {fmtOdds(r.odds)} · {fmt(r.stake)} stake</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: r.profit >= 0 ? "#00ff87" : "#ff4b4b" }}>
                    {r.profit >= 0 ? "+" : ""}{fmt(r.profit)}
                  </div>
                  <div style={{ fontSize: 10, color: r.won ? "#00ff87" : "#ff4b4b" }}>{r.won ? "WON" : "LOST"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 16 }}>BANKROLL SETTINGS</div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 10, lineHeight: 1.7 }}>
                Set your starting bankroll. Kelly Criterion stakes are calculated as a % of this amount automatically.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={bankrollInput}
                  onChange={e => setBankrollInput(e.target.value)}
                  style={{
                    flex: 1, padding: "12px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid #222", color: "#e0e0e0",
                    fontSize: 16, fontFamily: "inherit", borderRadius: 3, outline: "none"
                  }}
                  placeholder="e.g. 500"
                />
                <button onClick={setBankrollAmount} style={{
                  padding: "12px 20px", fontSize: 11, letterSpacing: 2,
                  background: accentColor, color: "#000", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: "bold", borderRadius: 3
                }}>SET</button>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 16 }}>SYSTEM INFO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "AI Model", value: "Claude Sonnet 4" },
                  { label: "NRL Data", value: "Squiggle API (official stats)" },
                  { label: "WC Data", value: "API-Football v3" },
                  { label: "Odds Source", value: "The Odds API (AU markets)" },
                  { label: "Analysis Method", value: "Stats & form only — no media" },
                  { label: "Stake Method", value: "25% Fractional Kelly" },
                  { label: "Refresh Rate", value: "Every 15 minutes" },
                  { label: "Backend", value: connected ? "✓ Live" : "⚠ Demo" },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12
                  }}>
                    <span style={{ color: "#555" }}>{label}</span>
                    <span style={{ color: label === "Analysis Method" ? "#ffd700" : "#e0e0e0" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "14px", background: "rgba(255,75,75,0.05)", border: "1px solid rgba(255,75,75,0.15)", borderRadius: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#ff4b4b", marginBottom: 6 }}>DISCLAIMER</div>
              <div style={{ fontSize: 10, color: "#555", lineHeight: 1.8 }}>
                AI-generated picks only. Not financial advice. Past performance does not guarantee future results. Always gamble responsibly. 18+. Help: Gambling Help Online 1800 858 858.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
