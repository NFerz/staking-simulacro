import { useState, useEffect, useRef } from "react";

// ── Utility ──
const fmt = (n, d = 2) => {
  if (n >= 1e9) return (n / 1e9).toFixed(d) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(d) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(d) + "K";
  return Number(n).toFixed(d);
};
const pct = (n) => (n * 100).toFixed(1) + "%";
const usd = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Model Data (from Staking Model spreadsheet) ──
const MODEL = {
  totalSupply: 1_000_000_000,
  circulatingPct: 0.161,
  stakingParticipation: 0.30,
  bootstrapAPY: 0.30,
  decayRate: 0.10,
  tokenPrice: 0.075,
  beta: 0.30,
  platformFee: 0.08,
  avgDiscount: 0.25,
};
MODEL.circulating = MODEL.totalSupply * MODEL.circulatingPct;
MODEL.staked = MODEL.circulating * MODEL.stakingParticipation;
MODEL.rewards = MODEL.staked * MODEL.bootstrapAPY;

const monthlyAPY = Array.from({ length: 12 }, (_, i) => {
  const E0 = 2_019_314;
  const Et = E0 * Math.pow(1 - MODEL.decayRate, i);
  const emissionAPY = Et / (MODEL.staked / 12);
  const investors = 800 * Math.pow(1.2, i);
  const gmv = investors * 1 * 55.4;
  const revenue = gmv * 0.06;
  const tokensFromRev = revenue / MODEL.tokenPrice;
  const revAPY = (tokensFromRev * MODEL.beta) / (MODEL.staked / 12);
  return { month: i + 1, emissionAPY, revAPY, totalAPY: emissionAPY + revAPY, Et };
});

// ── Icons ──
const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const StakeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ExternalLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Mini APY Chart ──
function APYChart({ data, width = 320, height = 120 }) {
  const max = Math.max(...data.map((d) => d.totalAPY));
  const min = Math.min(...data.map((d) => d.totalAPY));
  const range = max - min || 1;
  const pad = { t: 16, r: 12, b: 24, l: 40 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;

  const points = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * w;
    const y = pad.t + (1 - (d.totalAPY - min) / range) * h;
    return { x, y, ...d };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = line + ` L${points[points.length - 1].x},${pad.t + h} L${points[0].x},${pad.t + h} Z`;

  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="apy-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = pad.t + (1 - (v - min) / range) * h;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + w} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="'DM Mono', monospace">
              {pct(v)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#apy-grad)" />
      <path d={line} fill="none" stroke="#22c55e" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" />
      ))}
      {data.map((d, i) => {
        const x = pad.l + (i / (data.length - 1)) * w;
        return (
          <text key={i} x={x} y={pad.t + h + 16} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="'DM Mono', monospace">
            M{d.month}
          </text>
        );
      })}
    </svg>
  );
}

// ── Tooltip ──
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#e2e8f0",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            lineHeight: "1.5",
            whiteSpace: "nowrap",
            zIndex: 100,
            border: "1px solid #334155",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// ── Main App ──
export default function WINStakingPortal() {
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState("stake"); // stake | unstake
  const [amount, setAmount] = useState("");
  const [showTx, setShowTx] = useState(false);
  const [txDone, setTxDone] = useState(false);
  const [cooldowns, setCooldowns] = useState([]);
  const [userStaked, setUserStaked] = useState(0);
  const [faqOpen, setFaqOpen] = useState(null);

  // simulated wallet
  const walletBalance = 125_000;
  const currentAPY = monthlyAPY[0].totalAPY;
  const sWINRate = 1.0; // initial 1:1

  const handleStake = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setShowTx(true);
    setTimeout(() => {
      setUserStaked((prev) => prev + val);
      setTxDone(true);
      setAmount("");
      setTimeout(() => {
        setShowTx(false);
        setTxDone(false);
      }, 2000);
    }, 1500);
  };

  const handleUnstake = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > userStaked) return;
    setShowTx(true);
    setTimeout(() => {
      setUserStaked((prev) => prev - val);
      setCooldowns((prev) => [...prev, { amount: val, start: Date.now(), end: Date.now() + 7 * 86400000 }]);
      setTxDone(true);
      setAmount("");
      setTimeout(() => {
        setShowTx(false);
        setTxDone(false);
      }, 2000);
    }, 1500);
  };

  const maxAmount = tab === "stake" ? walletBalance - userStaked : userStaked;

  const faqs = [
    { q: "What is sWIN?", a: "sWIN is a receipt token you receive when you stake $WIN. It represents your staked position and automatically accrues value over time as rewards are distributed." },
    { q: "How does the 7-day cooldown work?", a: "When you initiate an unstake, a 7-day cooldown begins. During this period, your tokens cannot be used or restaked, and rewards stop accruing. After the cooldown, you can withdraw with one click." },
    { q: "Where do staking rewards come from?", a: "Rewards come from two sources: (1) Bootstrap emissions that decay over time, and (2) a share of platform revenue routed to stakers via buybacks. Over time, rewards transition fully to revenue-backed." },
    { q: "Is there a minimum stake?", a: "No. There are no minimum or maximum staking constraints, no lock-up tiers, and no penalizing unstaking fees. Staking is designed to be simple and accessible." },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080b12",
        color: "#e2e8f0",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #22c55e33; color: #22c55e; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .stat-card { 
          background: linear-gradient(135deg, #0f1724 0%, #111827 100%);
          border: 1px solid #1e293b;
          border-radius: 14px;
          padding: 20px 22px;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .stat-card:hover {
          border-color: #334155;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.04);
        }
        .action-card {
          background: linear-gradient(160deg, #0f1724 0%, #0d1320 100%);
          border: 1px solid #1e293b;
          border-radius: 16px;
          overflow: hidden;
        }
        .tab-btn {
          flex: 1;
          padding: 12px 0;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          transition: all 0.25s;
          border-radius: 10px;
          letter-spacing: 0.3px;
        }
        .tab-active {
          background: #22c55e;
          color: #080b12;
        }
        .tab-inactive {
          background: transparent;
          color: #64748b;
        }
        .tab-inactive:hover { color: #94a3b8; }
        .input-wrap {
          display: flex;
          align-items: center;
          background: #080b12;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 4px 4px 4px 16px;
          transition: border-color 0.25s;
        }
        .input-wrap:focus-within { border-color: #22c55e44; }
        .amount-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e2e8f0;
          font-family: 'DM Mono', monospace;
          font-size: 20px;
          font-weight: 400;
          padding: 12px 0;
          width: 100%;
        }
        .amount-input::placeholder { color: #334155; }
        .max-btn {
          background: #22c55e18;
          color: #22c55e;
          border: 1px solid #22c55e33;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          cursor: pointer;
          letter-spacing: 1px;
          transition: all 0.2s;
        }
        .max-btn:hover { background: #22c55e28; border-color: #22c55e66; }
        .stake-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          letter-spacing: 0.4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .stake-btn-active { background: #22c55e; color: #080b12; }
        .stake-btn-active:hover { background: #16a34a; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34,197,94,0.25); }
        .stake-btn-disabled { background: #1e293b; color: #475569; cursor: not-allowed; }
        .unstake-btn-active { background: #ef4444; color: white; }
        .unstake-btn-active:hover { background: #dc2626; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(239,68,68,0.25); }
        .connect-btn {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #080b12;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          letter-spacing: 0.3px;
        }
        .connect-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(34,197,94,0.3); }
        .faq-item {
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .faq-item:hover { border-color: #334155; }
        .faq-q {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }
        .faq-q:hover { color: #22c55e; }
        .cooldown-bar {
          height: 3px;
          background: #1e293b;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }
        .cooldown-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #4ade80);
          border-radius: 2px;
          transition: width 0.5s;
        }
      `}</style>

      {/* ── Nav ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid #111827",
          background: "#080b12ee",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #15803d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "#080b12",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              W
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.4px" }}>WIN</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Sports Market", "Fantasy", "Investments", "Staking"].map((item) => (
              <span
                key={item}
                style={{
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: item === "Staking" ? 600 : 400,
                  color: item === "Staking" ? "#22c55e" : "#64748b",
                  background: item === "Staking" ? "#22c55e12" : "transparent",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "color 0.2s",
                  letterSpacing: "0.1px",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                background: "#0f1724",
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse-glow 2s infinite" }} />
              0x7a3F...e4Bc
            </div>
          </div>
        ) : (
          <button className="connect-btn" onClick={() => setConnected(true)}>
            <WalletIcon />
            Connect Wallet
          </button>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <div style={{ textAlign: "center", padding: "48px 32px 12px", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 300,
            background: "radial-gradient(ellipse, #22c55e08 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <ShieldIcon />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
            Stake $WIN · Earn Rewards
          </span>
        </div>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            background: "linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          WIN Staking
        </h1>
        <p style={{ fontSize: 15, color: "#64748b", marginTop: 12, maxWidth: 480, margin: "12px auto 0", lineHeight: 1.6 }}>
          Stake $WIN, receive sWIN, and earn rewards automatically. No complex locks, no manual compounding.
        </p>
      </div>

      {/* ── Protocol Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          maxWidth: 900,
          margin: "28px auto 0",
          padding: "0 32px",
        }}
      >
        {[
          { label: "Current APY", value: pct(currentAPY), sub: "Variable rate", accent: true },
          { label: "Total WIN Staked", value: fmt(MODEL.staked, 1), sub: pct(MODEL.stakingParticipation) + " participation" },
          { label: "sWIN Exchange Rate", value: "1.000", sub: "1 sWIN = 1 WIN" },
          { label: "Total Rewards (Y1)", value: usd(MODEL.rewards * MODEL.tokenPrice), sub: fmt(MODEL.rewards, 1) + " WIN" },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animation: `slide-up 0.5s ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</span>
              <Tooltip text={s.sub}>
                <InfoIcon />
              </Tooltip>
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                color: s.accent ? "#22c55e" : "#f1f5f9",
                letterSpacing: "-0.5px",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          maxWidth: 900,
          margin: "28px auto 0",
          padding: "0 32px",
          alignItems: "start",
        }}
      >
        {/* Left: Action Panel */}
        <div className="action-card">
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, padding: "16px 16px 0" }}>
            <div style={{ display: "flex", flex: 1, background: "#0f1724", borderRadius: 12, padding: 3 }}>
              {["stake", "unstake"].map((t) => (
                <button
                  key={t}
                  className={`tab-btn ${tab === t ? "tab-active" : "tab-inactive"}`}
                  onClick={() => {
                    setTab(t);
                    setAmount("");
                  }}
                >
                  {t === "stake" ? "Stake" : "Unstake"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "20px 20px 24px" }}>
            {!connected ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Connect your wallet to start staking</div>
                <button className="connect-btn" onClick={() => setConnected(true)} style={{ margin: "0 auto" }}>
                  <WalletIcon />
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Balance display */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span>{tab === "stake" ? "Wallet Balance" : "Staked Balance"}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>
                    {fmt(tab === "stake" ? walletBalance - userStaked : userStaked, 0)} WIN
                  </span>
                </div>

                {/* Input */}
                <div className="input-wrap">
                  <input
                    type="number"
                    className="amount-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="max-btn" onClick={() => setAmount(String(maxAmount))}>
                      MAX
                    </button>
                    <div
                      style={{
                        background: "#1e293b",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #22c55e, #15803d)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 800,
                          color: "#080b12",
                        }}
                      >
                        W
                      </div>
                      WIN
                    </div>
                  </div>
                </div>

                {/* Conversion preview */}
                {amount && parseFloat(amount) > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      background: "#0d111b",
                      borderRadius: 10,
                      border: "1px solid #1e293b22",
                      animation: "slide-up 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      <span>You will {tab === "stake" ? "receive" : "get back"}</span>
                      <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                        {tab === "stake"
                          ? fmt(parseFloat(amount) / sWINRate, 2) + " sWIN"
                          : fmt(parseFloat(amount) * sWINRate, 2) + " WIN"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                      <span>Exchange rate</span>
                      <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>1 WIN = {sWINRate.toFixed(4)} sWIN</span>
                    </div>
                    {tab === "unstake" && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginTop: 6 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <ClockIcon /> Cooldown
                        </span>
                        <span style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>7 days</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action button */}
                <button
                  className={`stake-btn ${
                    !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount
                      ? "stake-btn-disabled"
                      : tab === "stake"
                      ? "stake-btn-active"
                      : "unstake-btn-active"
                  }`}
                  style={{ marginTop: 16 }}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || showTx}
                  onClick={tab === "stake" ? handleStake : handleUnstake}
                >
                  {showTx ? (
                    txDone ? (
                      "✓ Confirmed"
                    ) : (
                      <>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            border: "2px solid currentColor",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        Confirming...
                      </>
                    )
                  ) : tab === "stake" ? (
                    <>
                      <StakeIcon /> Stake WIN
                    </>
                  ) : (
                    "Unstake WIN"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: User Stats + Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* My Position */}
          {connected && (
            <div className="action-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 16, letterSpacing: "0.5px" }}>My Position</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Staked", value: fmt(userStaked, 0) + " WIN", sub: usd(userStaked * MODEL.tokenPrice) },
                  { label: "sWIN Balance", value: fmt(userStaked / sWINRate, 0) + " sWIN", sub: "Receipt tokens" },
                  { label: "Pending Rewards", value: fmt(userStaked * (currentAPY / 12), 0) + " WIN", sub: "Est. this month" },
                  { label: "My APY", value: pct(currentAPY), sub: "Current rate", accent: true },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "10px 0" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        fontFamily: "'DM Mono', monospace",
                        color: s.accent ? "#22c55e" : "#f1f5f9",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Cooldowns */}
              {cooldowns.length > 0 && (
                <div style={{ marginTop: 16, borderTop: "1px solid #1e293b", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, color: "#f59e0b" }}>
                    <ClockIcon /> Active Cooldowns
                  </div>
                  {cooldowns.map((cd, i) => {
                    const elapsed = (Date.now() - cd.start) / (cd.end - cd.start);
                    const daysLeft = Math.max(0, Math.ceil((cd.end - Date.now()) / 86400000));
                    return (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                          <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(cd.amount, 0)} WIN</span>
                          <span style={{ color: "#f59e0b" }}>{daysLeft}d remaining</span>
                        </div>
                        <div className="cooldown-bar">
                          <div className="cooldown-fill" style={{ width: `${Math.min(elapsed * 100, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* APY Projection Chart */}
          <div className="action-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px" }}>APY Projection (Year 1)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: "#64748b" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 2, background: "#22c55e", borderRadius: 1, display: "inline-block" }} /> Total APY
                </span>
              </div>
            </div>
            <APYChart data={monthlyAPY} width={400} height={140} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                padding: "10px 14px",
                background: "#0d111b",
                borderRadius: 10,
                fontSize: 11,
                color: "#64748b",
              }}
            >
              <span>
                M1: <span style={{ color: "#22c55e", fontFamily: "'DM Mono', monospace" }}>{pct(monthlyAPY[0].totalAPY)}</span>
              </span>
              <span>
                M6: <span style={{ color: "#22c55e", fontFamily: "'DM Mono', monospace" }}>{pct(monthlyAPY[5].totalAPY)}</span>
              </span>
              <span>
                M12: <span style={{ color: "#22c55e", fontFamily: "'DM Mono', monospace" }}>{pct(monthlyAPY[11].totalAPY)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div style={{ maxWidth: 900, margin: "48px auto 0", padding: "0 32px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 20, color: "#f1f5f9" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { step: "1", title: "Stake $WIN", desc: "Connect your wallet and stake any amount. Receive sWIN as your receipt token." },
            { step: "2", title: "Earn Automatically", desc: "sWIN accrues value over time. No manual compounding needed — the exchange rate grows." },
            { step: "3", title: "Unstake Anytime", desc: "Initiate unstake, wait 7-day cooldown, then withdraw your WIN at the current rate." },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ animation: `slide-up 0.5s ${i * 0.1}s both` }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#22c55e18",
                  border: "1px solid #22c55e33",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#22c55e",
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: 12,
                }}
              >
                {s.step}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#e2e8f0" }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Protocol Details ── */}
      <div style={{ maxWidth: 900, margin: "36px auto 0", padding: "0 32px" }}>
        <div className="action-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 16, letterSpacing: "0.5px" }}>Protocol Statistics</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
            {[
              ["Total Supply", fmt(MODEL.totalSupply, 0) + " WIN"],
              ["Circulating at TGE", pct(MODEL.circulatingPct)],
              ["Staking Participation", pct(MODEL.stakingParticipation)],
              ["Bootstrap APY (Y1)", pct(MODEL.bootstrapAPY)],
              ["Emission Decay", pct(MODEL.decayRate) + " / month"],
              ["Revenue Share (β)", pct(MODEL.beta)],
              ["Platform Fee", pct(MODEL.platformFee)],
              ["Effective Take Rate", pct(MODEL.platformFee * (1 - MODEL.avgDiscount))],
            ].map(([label, value], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: i < 6 ? "1px solid #1e293b22" : "none",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: "#e2e8f0", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ maxWidth: 900, margin: "36px auto 0", padding: "0 32px 80px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 16, color: "#f1f5f9" }}>FAQ</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((f, i) => (
            <div key={i} className="faq-item">
              <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                {f.q}
                <span style={{ transform: faqOpen === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }}>
                  <ChevronDown />
                </span>
              </button>
              {faqOpen === i && (
                <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#64748b", lineHeight: 1.7, animation: "slide-up 0.3s" }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: "1px solid #111827",
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#334155",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <span>WIN Investments © 2025 — Powered by thirdweb</span>
        <div style={{ display: "flex", gap: 16 }}>
          {["Docs", "Contract", "Audit"].map((l) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#475569" }}>
              {l} <ExternalLink />
            </span>
          ))}
        </div>
      </div>

      {/* ── Transaction Overlay ── */}
      {showTx && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#080b12cc",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#0f1724",
              border: "1px solid #1e293b",
              borderRadius: 20,
              padding: "40px 48px",
              textAlign: "center",
              animation: "slide-up 0.3s",
            }}
          >
            {txDone ? (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#22c55e22",
                    border: "2px solid #22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 28,
                  }}
                >
                  ✓
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#22c55e" }}>Transaction Confirmed</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  {tab === "stake" ? "Your WIN has been staked successfully" : "Unstake initiated — 7-day cooldown started"}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: "3px solid #22c55e33",
                    borderTopColor: "#22c55e",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <div style={{ fontSize: 16, fontWeight: 600 }}>Confirm in Wallet</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Waiting for transaction confirmation...</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
