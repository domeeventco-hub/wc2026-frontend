import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────
// Replace with your Railway backend URL after deployment
const API_BASE = "https://wc2026-backend-production-3745.up.railway.app";
// e.g. "https://wc2026-backend.up.railway.app"
// ─────────────────────────────────────────────────────────────────

const fmt = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";
const fmtOdds = (n) => n != null ? Number(n).toFixed(2) : "—";

const VERDICT_STYLE = {
  BET:    { color: "#00ff87", bg: "rgba(0,255,135,0.1)",  border: "rgba(0,255,135,0.3)" },
  "NO BET": { color: "#ff4b4b", bg: "rgba(255,75,75,0.08)", border: "rgba(255,75,75,0.3)" },
  WATCH:  { color: "#ffd700", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.3)" },
};

const RISK_COLOR = { LOW: "#00ff87", MEDIUM: "#ffd700", HIGH: "#ff4b4b" };

// ─── MOCK DATA for when backend isn't connected yet ───────────────
const MOCK_PICKS = [
  {
    verdict: "BET", confidence: 78, risk: "MEDIUM",
    primaryBet: "France to Win", market: "Match Result",
    recommendedOdds: 1.85, kellyStake: 42.50, edge: "France's superior squad depth and tournament experience gives clear value at these odds.",
    prediction: "France 2-1 Germany", trueProbability: 62, impliedProbability: 54,
    keyFactors: ["France unbeaten in last 8 tournaments games", "Germany missing key midfielder", "Historical H2H favours France"],
    concerns: ["Germany's home support equivalent", "France's slow tournament starts"],
    reasoning: "France enter this fixture as clear favourites with a fully fit squad. Germany's midfield absence is a significant blow and the odds haven't fully adjusted.",
    alternativeBet: "Both Teams to Score @ 1.72",
    odds: { home: 1.85, draw: 3.40, away: 4.20, bookmaker: "Sportsbet" },
    match: { home: "France", away: "Germany", date: "2026-06-19T19:00:00", venue: "MetLife Stadium, NY", homeFlag: "🇫🇷", awayFlag: "🇩🇪" },
    analysedAt: new Date().toISOString()
  },
  {
    verdict: "WATCH", confidence: 55, risk: "HIGH",
    primaryBet: "Over 2.5 Goals", market: "Over/Under",
    recommendedOdds: 1.90, kellyStake: 0, edge: "Both sides attack freely but defensive uncertainties make this volatile.",
    prediction: "Brazil 1-1 Portugal", trueProbability: 50, impliedProbability: 52,
    keyFactors: ["Both teams average 2.8 goals/game", "Attacking talent on both sides", "Neither team needs to win — group already secured"],
    concerns: ["Group stage complacency risk", "Possible rotation from both managers"],
    reasoning: "This fixture has all the ingredients for goals but the tactical stakes may lead both managers to be conservative with key players. Monitor team news 2hrs before kickoff.",
    alternativeBet: "Draw @ 3.10",
    odds: { home: 1.95, draw: 3.10, away: 3.80, bookmaker: "TAB" },
    match: { home: "Brazil", away: "Portugal", date: "2026-06-20T19:00:00", venue: "AT&T Stadium, Dallas", homeFlag: "🇧🇷", awayFlag: "🇵🇹" },
    analysedAt: new Date().toISOString()
  },
  {
    verdict: "NO BET", confidence: 82, risk: "LOW",
    primaryBet: "No value found", market: "—",
    recommendedOdds: null, kellyStake: 0, edge: "Market odds accurately reflect true probabilities. No edge available.",
    prediction: "Argentina 2-0 Chile", trueProbability: 68, impliedProbability: 69,
    keyFactors: ["Argentina heavy favourites — odds reflect reality", "Chile struggling for form", "No injury news to create value"],
    concerns: ["Correctly priced market", "Vig erodes any marginal edge"],
    reasoning: "Argentina are the stronger side but the market knows it. Laying Argentina at these odds offers no mathematical edge. Discipline means skipping correctly priced matches.",
    alternativeBet: "Argentina -1.5 Asian Handicap @ 2.10 if you want action",
    odds: { home: 1.40, draw: 4.50, away: 7.00, bookmaker: "Bet365" },
    match: { home: "Argentina", away: "Chile", date: "2026-06-13T19:00:00", venue: "MetLife Stadium, NY", homeFlag: "🇦🇷", awayFlag: "🇨🇱" },
    analysedAt: new Date().toISOString()
  }
];

const MOCK_RESULTS = {
  results: [
    { match: "France vs Germany", bet: "France Win", odds: 1.85, stake: 42.50, won: true, profit: 36.13 },
    { match: "Brazil vs Portugal", bet: "Over 2.5", odds: 1.90, stake: 25.00, won: false, profit: -25.00 },
  ],
  total_profit: 11.13, win_rate: 50, roi: 1.1
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

function PickCard({ pick, onResult, bankroll }) {
  const [expanded, setExpanded] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const vs = VERDICT_STYLE[pick.verdict] || VERDICT_STYLE["WATCH"];
  const matchDate = new Date(pick.match?.date);
  const timeStr = matchDate.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: `1px solid ${vs.border}`,
      borderRadius: 4, overflow: "hidden", marginBottom: 12,
      transition: "all 0.2s"
    }}>
      {/* Card header */}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", marginBottom: 5 }}>{timeStr}</div>
            <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>
              {pick.match?.homeFlag} {pick.match?.home} <span style={{ color: "#333" }}>vs</span> {pick.match?.away} {pick.match?.awayFlag}
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
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#888" }}>
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

      {/* Expanded analysis */}
      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Odds table */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "16px 0" }}>
            {[
              { label: pick.match?.home, val: pick.odds?.home },
              { label: "DRAW", val: pick.odds?.draw },
              { label: pick.match?.away, val: pick.odds?.away },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 3 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#555", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: "bold" }}>{fmtOdds(val)}</div>
              </div>
            ))}
          </div>

          {/* Edge */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#555", marginBottom: 6 }}>BETTING EDGE</div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>{pick.edge}</div>
          </div>

          {/* Key factors & concerns */}
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

          {/* Reasoning */}
          <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid #222", marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#444", marginBottom: 6 }}>AI REASONING</div>
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.8 }}>{pick.reasoning}</div>
          </div>

          {/* Prediction & alternative */}
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

          {/* Risk */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#444" }}>RISK LEVEL:</div>
            <Pill label={pick.risk} color={RISK_COLOR[pick.risk]} bg="transparent" border={RISK_COLOR[pick.risk] + "44"} />
          </div>

          {/* Record result button */}
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
  const [tab, setTab] = useState("picks");
  const [picks, setPicks] = useState(MOCK_PICKS);
  const [results, setResults] = useState(MOCK_RESULTS);
  const [bankroll, setBankroll] = useState({ starting: 1000, current: 1000, currency: "AUD" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [bankrollInput, setBankrollInput] = useState("1000");
  const [filter, setFilter] = useState("ALL");

  const fetchData = useCallback(async () => {
    if (API_BASE === "YOUR_RAILWAY_BACKEND_URL_HERE") return;
    setLoading(true);
    try {
      const [picksRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/picks`),
        fetch(`${API_BASE}/results`)
      ]);
      const picksData   = await picksRes.json();
      const resultsData = await resultsRes.json();
      setPicks(picksData.picks || []);
      setBankroll(picksData.bankroll);
      setLastUpdated(picksData.last_updated);
      setResults(resultsData);
      setConnected(true);
    } catch (e) {
      console.log("Using demo data — connect backend to go live");
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
      won
    };
    if (connected) {
      await fetch(`${API_BASE}/result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      fetchData();
    } else {
      const profit = won ? payload.stake * (payload.odds - 1) : -payload.stake;
      setResults(prev => ({
        ...prev,
        results: [...prev.results, { ...payload, profit }],
        total_profit: prev.total_profit + profit,
        win_rate: Math.round(((prev.results.filter(r => r.won).length + (won ? 1 : 0)) / (prev.results.length + 1)) * 100),
      }));
      setBankroll(prev => ({ ...prev, current: prev.current + profit }));
    }
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

  const filteredPicks = filter === "ALL" ? picks : picks.filter(p => p.verdict === filter);
  const profitPositive = (results.total_profit || 0) >= 0;
  const betPicks = picks.filter(p => p.verdict === "BET");

  return (
    <div style={{
      minHeight: "100vh", maxWidth: 480, margin: "0 auto",
      background: "#060a0f",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e0e0e0",
      position: "relative"
    }}>
      {/* Noise overlay */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03, zIndex: 0, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")"
      }} />

      {/* Status bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(6,10,15,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 18px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 5, color: "#00ff87", marginBottom: 2 }}>⚽ FIFA WORLD CUP 2026</div>
            <div style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>AI PICKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 9, letterSpacing: 2,
              color: connected ? "#00ff87" : "#ffd700",
              padding: "4px 8px", border: `1px solid ${connected ? "rgba(0,255,135,0.3)" : "rgba(255,215,0,0.3)"}`,
              borderRadius: 2
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "#00ff87" : "#ffd700", display: "inline-block" }} />
              {connected ? "LIVE" : "DEMO"}
            </div>
            {lastUpdated && <div style={{ fontSize: 9, color: "#333", marginTop: 3 }}>
              {new Date(lastUpdated).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </div>}
          </div>
        </div>
      </div>

      {/* Bankroll strip */}
      <div style={{
        padding: "12px 18px",
        background: "rgba(0,255,135,0.04)",
        borderBottom: "1px solid rgba(0,255,135,0.1)",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#555" }}>BANKROLL</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#00ff87" }}>
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
          <div style={{ fontSize: 16, fontWeight: "bold" }}>{results.win_rate}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 63, zIndex: 99,
        background: "rgba(6,10,15,0.95)", backdropFilter: "blur(12px)"
      }}>
        {["picks", "tracker", "settings"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "12px", fontSize: 10, letterSpacing: 3,
            background: "transparent",
            color: tab === t ? "#00ff87" : "#444",
            border: "none",
            borderBottom: `2px solid ${tab === t ? "#00ff87" : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase"
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "18px", position: "relative", zIndex: 1 }}>

        {/* ── PICKS TAB ── */}
        {tab === "picks" && (
          <div>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {["ALL", "BET", "WATCH", "NO BET"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "5px 12px", fontSize: 9, letterSpacing: 2,
                  background: filter === f ? (VERDICT_STYLE[f]?.bg || "rgba(255,255,255,0.1)") : "transparent",
                  color: filter === f ? (VERDICT_STYLE[f]?.color || "#fff") : "#444",
                  border: `1px solid ${filter === f ? (VERDICT_STYLE[f]?.border || "#444") : "#222"}`,
                  cursor: "pointer", fontFamily: "inherit"
                }}>{f} {f !== "ALL" ? `(${picks.filter(p=>p.verdict===f).length})` : `(${picks.length})`}</button>
              ))}
            </div>

            {/* Today's best bet highlight */}
            {betPicks.length > 0 && filter === "ALL" && (
              <div style={{
                padding: "14px 16px", marginBottom: 18,
                background: "rgba(0,255,135,0.06)", border: "1px solid rgba(0,255,135,0.2)",
                borderRadius: 4
              }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: "#00ff87", marginBottom: 6 }}>⚡ TOP PICK TODAY</div>
                <div style={{ fontSize: 15, fontWeight: "bold" }}>
                  {betPicks.sort((a,b) => b.confidence - a.confidence)[0]?.match?.home} vs {betPicks.sort((a,b) => b.confidence - a.confidence)[0]?.match?.away}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {betPicks.sort((a,b) => b.confidence - a.confidence)[0]?.primaryBet} · {betPicks.sort((a,b) => b.confidence - a.confidence)[0]?.confidence}% confidence
                </div>
              </div>
            )}

            {loading && <div style={{ textAlign: "center", padding: 40, color: "#333", fontSize: 12, letterSpacing: 3 }}>LOADING LIVE DATA...</div>}

            {!loading && filteredPicks.map((pick, i) => (
              <PickCard key={i} pick={pick} onResult={handleResult} bankroll={bankroll} />
            ))}

            {!connected && (
              <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: "#ffd700", marginBottom: 6 }}>DEMO MODE</div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7 }}>
                  You're seeing sample picks. Deploy the backend to Railway and update <code style={{ color: "#ffd700" }}>API_BASE</code> in the code to go fully live with real data.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRACKER TAB ── */}
        {tab === "tracker" && (
          <div>
            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "TOTAL BETS", value: results.results?.length || 0, color: "#fff" },
                { label: "WIN RATE", value: `${results.win_rate}%`, color: results.win_rate >= 50 ? "#00ff87" : "#ff4b4b" },
                { label: "TOTAL P&L", value: fmt(results.total_profit), color: profitPositive ? "#00ff87" : "#ff4b4b" },
                { label: "ROI", value: `${results.roi}%`, color: results.roi >= 0 ? "#00ff87" : "#ff4b4b" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "#444", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: "bold", color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Bet history */}
            <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 14 }}>BET HISTORY</div>
            {results.results?.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#333", fontSize: 11, letterSpacing: 3 }}>NO BETS RECORDED YET</div>
            )}
            {results.results?.map((r, i) => (
              <div key={i} style={{
                padding: "12px 14px", marginBottom: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 3, display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
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
                Set your starting bankroll. Kelly Criterion stakes are calculated automatically as a % of this amount.
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
                  background: "#00ff87", color: "#000", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: "bold", borderRadius: 3
                }}>SET</button>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 16 }}>BACKEND CONNECTION</div>
              <div style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid #222", borderRadius: 3 }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>CURRENT API URL</div>
                <code style={{ fontSize: 11, color: connected ? "#00ff87" : "#ffd700", wordBreak: "break-all" }}>
                  {API_BASE}
                </code>
                <div style={{ fontSize: 10, color: "#444", marginTop: 10, lineHeight: 1.7 }}>
                  {connected
                    ? "✓ Connected to live backend. Data refreshes every 15 minutes."
                    : "⚠ Not connected. Update API_BASE in the source code with your Railway URL to go live."}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", marginBottom: 16 }}>SYSTEM INFO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "AI Model", value: "Claude Sonnet 4" },
                  { label: "Odds Source", value: "The Odds API (AU markets)" },
                  { label: "Football Data", value: "API-Football v3" },
                  { label: "Stake Method", value: "25% Fractional Kelly" },
                  { label: "Refresh Rate", value: "Every 15 minutes" },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: 12
                  }}>
                    <span style={{ color: "#555" }}>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 32, padding: "14px", background: "rgba(255,75,75,0.05)", border: "1px solid rgba(255,75,75,0.15)", borderRadius: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#ff4b4b", marginBottom: 6 }}>DISCLAIMER</div>
              <div style={{ fontSize: 10, color: "#555", lineHeight: 1.8 }}>
                This tool is for educational and personal use only. All picks are AI-generated estimates, not guaranteed outcomes. Always gamble responsibly. 18+. If gambling is causing harm, contact Gambling Help Online: 1800 858 858.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
