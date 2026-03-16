import { useState, useRef, useEffect } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Sparkles, RotateCcw, Trophy, AlertCircle, X } from "lucide-react";

const SEGMENTS = [
  { label: "0.00×", multiplier: 0, color: "#1a2235", textColor: "#6b7280" },
  { label: "1.5×",  multiplier: 1.5, color: "#14532d", textColor: "#4ade80" },
  { label: "0.00×", multiplier: 0, color: "#1e1b2e", textColor: "#6b7280" },
  { label: "2×",    multiplier: 2, color: "#1e3a5f", textColor: "#60a5fa" },
  { label: "0.00×", multiplier: 0, color: "#1a2235", textColor: "#6b7280" },
  { label: "3×",    multiplier: 3, color: "#7c2d12", textColor: "#fb923c" },
  { label: "0.00×", multiplier: 0, color: "#1e1b2e", textColor: "#6b7280" },
  { label: "5×",    multiplier: 5, color: "#14532d", textColor: "#00e65c" },
  { label: "0.00×", multiplier: 0, color: "#1a2235", textColor: "#6b7280" },
  { label: "1.5×",  multiplier: 1.5, color: "#312e81", textColor: "#a78bfa" },
  { label: "0.00×", multiplier: 0, color: "#1e1b2e", textColor: "#6b7280" },
  { label: "10×",   multiplier: 10, color: "#713f12", textColor: "#fbbf24" },
];

const NUM = SEGMENTS.length;
const SLICE = 360 / NUM;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function SpinWheel({ rotation }: { rotation: number }) {
  const cx = 200, cy = 200, r = 190;
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px rgba(0,230,92,0.2))" }}>
      <circle cx={cx} cy={cy} r={195} fill="none" stroke="rgba(0,230,92,0.2)" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={197} fill="none" stroke="rgba(0,230,92,0.08)" strokeWidth="3" />
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "200px 200px", transition: "none" }}>
        {SEGMENTS.map((seg, i) => {
          const startDeg = i * SLICE;
          const endDeg = startDeg + SLICE;
          const mid = startDeg + SLICE / 2;
          const textR = r * 0.65;
          const tp = polarToCartesian(cx, cy, textR, mid);
          return (
            <g key={i}>
              <path d={segmentPath(cx, cy, r, startDeg, endDeg)} fill={seg.color} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
              <text x={tp.x} y={tp.y} fill={seg.textColor}
                fontSize={seg.multiplier >= 10 ? "15" : seg.multiplier === 0 ? "11" : "14"}
                fontWeight="bold" fontFamily="system-ui, sans-serif"
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
              >
                {seg.label}
              </text>
            </g>
          );
        })}
      </g>
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "200px 200px", transition: "none" }}>
        {SEGMENTS.map((_, i) => {
          const deg = i * SLICE;
          const p = polarToCartesian(cx, cy, r, deg);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />;
        })}
      </g>
      <circle cx={cx} cy={cy} r={28} fill="#0d0d1a" stroke="rgba(0,230,92,0.5)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={18} fill="rgba(0,230,92,0.15)" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="18" fill="#00e65c">⚽</text>
    </svg>
  );
}

type SpinResult = {
  segmentIndex: number;
  multiplier: number;
  label: string;
  stake: number;
  winnings: number;
  newBalance: number;
};

export default function LuckyWheelPage() {
  const [amount, setAmount] = useState("50");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [minSpin, setMinSpin] = useState(10);
  const [maxSpin, setMaxSpin] = useState(50000);
  const wheelRef = useRef<HTMLDivElement>(null);
  const currentRotationRef = useRef(0);
  const qc = useQueryClient();

  // Fetch spin config (min/max) from backend
  useEffect(() => {
    apiFetch("/spin/config").then(r => r.json()).then(d => {
      if (d.minSpinAmount) setMinSpin(d.minSpinAmount);
      if (d.maxSpinAmount) setMaxSpin(d.maxSpinAmount);
    }).catch(() => {});
  }, []);

  const balls = Array.from({ length: 8 }, (_, i) => i);
  const isWin = result && result.multiplier > 0;

  async function handleSpin() {
    const stake = Number(amount);
    if (!stake || stake < minSpin) { setError(`Minimum spin is KSh ${minSpin}`); return; }
    if (stake > maxSpin) { setError(`Maximum spin is KSh ${maxSpin.toLocaleString()}`); return; }

    setError(null);
    setResult(null);
    setShowResult(false);
    setSpinning(true);

    try {
      const res = await apiFetch("/spin", { method: "POST", body: JSON.stringify({ amount: stake }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Spin failed"); setSpinning(false); return; }

      const targetSegmentAngle = data.segmentIndex * SLICE + SLICE / 2;
      const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
      const finalRotation = currentRotationRef.current + extraSpins + (360 - (currentRotationRef.current % 360)) - targetSegmentAngle;

      if (wheelRef.current) {
        const el = wheelRef.current.querySelector("svg g") as HTMLElement | null;
        if (el) {
          el.style.transition = `transform 4.5s cubic-bezier(0.17,0.67,0.12,0.99)`;
          el.style.transform = `rotate(${finalRotation}deg)`;
        }
      }

      setAnimating(true);
      setRotation(finalRotation);
      currentRotationRef.current = finalRotation;

      setTimeout(() => {
        setAnimating(false);
        setSpinning(false);
        setResult(data);
        setShowResult(true);
        qc.invalidateQueries({ queryKey: ["getBalance"] });
        qc.invalidateQueries({ queryKey: ["/api/user/balance"] });
      }, 4800);
    } catch {
      setError("Network error. Please try again.");
      setSpinning(false);
    }
  }

  function handleTryAgain() {
    setShowResult(false);
    setResult(null);
    setError(null);
  }

  useEffect(() => {
    if (!animating && wheelRef.current) {
      const el = wheelRef.current.querySelector("svg g") as HTMLElement | null;
      if (el) el.style.transition = "none";
    }
  }, [animating]);

  return (
    <UserLayout>
      <div className="relative min-h-screen overflow-hidden">
        {balls.map((i) => (
          <div key={i} className="absolute pointer-events-none text-2xl opacity-10 animate-bounce select-none"
            style={{ left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%`, animationDuration: `${2 + i * 0.4}s`, animationDelay: `${i * 0.3}s` }}>
            {["⚽", "🏆", "⚽", "🎯", "⚽", "🥅", "⚽", "🎉"][i]}
          </div>
        ))}

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Sparkles className="h-4 w-4" /> Lucky Wheel
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-3">
              Spin for <span className="text-primary">Luck</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter your amount, spin the wheel — land on a multiplier to win big. Pure fortune.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

            {/* ── Wheel + overlay ── */}
            <div className="flex flex-col items-center">
              {/* Pointer arrow */}
              <div className="relative mb-[-16px] z-20">
                <div className="w-0 h-0 mx-auto"
                  style={{ borderLeft: "14px solid transparent", borderRight: "14px solid transparent",
                    borderTop: "32px solid #00e65c", filter: "drop-shadow(0 0 8px rgba(0,230,92,0.8))" }} />
              </div>

              {/* Wheel + result overlay container */}
              <div className="relative w-full max-w-[420px] aspect-square">
                {/* Glow pulse while spinning */}
                {spinning && <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-pulse" />}

                {/* The wheel */}
                <div ref={wheelRef} className="w-full h-full">
                  <SpinWheel rotation={rotation} />
                </div>

                {/* ── Error overlay — appears ON TOP of wheel for any error ── */}
                {error && !showResult && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full z-30"
                    style={{ background: "radial-gradient(circle, rgba(13,13,26,0.95) 55%, rgba(13,13,26,0.75) 100%)" }}>
                    <div className="text-center px-6 py-4 max-w-[260px]">
                      <div className="w-14 h-14 rounded-full bg-destructive/20 border-2 border-destructive/50 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="h-7 w-7 text-destructive" />
                      </div>
                      <p className="text-destructive font-black text-lg font-display mb-2 leading-tight">Oops!</p>
                      <p className="text-white text-sm font-medium mb-4 leading-snug">{error}</p>
                      <Button onClick={() => setError(null)} size="sm"
                        className="bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive hover:text-white font-bold px-5">
                        <X className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Result overlay — appears ON TOP of wheel after spin ── */}
                {showResult && result && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full z-30"
                    style={{ background: "radial-gradient(circle, rgba(13,13,26,0.93) 55%, rgba(13,13,26,0.7) 100%)" }}>
                    <div className="text-center px-6 py-4 max-w-[260px]">
                      {isWin ? (
                        <>
                          <div className="text-5xl mb-2 animate-bounce">🏆</div>
                          <p className="text-primary font-black text-2xl font-display mb-1 leading-none">YOU WON!</p>
                          <p className="text-muted-foreground text-xs mb-2">
                            Landed on <span className="text-primary font-bold">{result.label}</span>
                          </p>
                          <div className="text-3xl font-display font-black text-primary mb-1">
                            +{formatCurrency(result.winnings)}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-4">
                            Balance: <span className="text-white font-bold">{formatCurrency(result.newBalance)}</span>
                          </p>
                          <Button onClick={handleTryAgain} size="sm"
                            className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_16px_rgba(0,230,92,0.4)] px-5">
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Spin Again
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl mb-2">😔</div>
                          <p className="text-destructive font-black text-xl font-display mb-1 leading-none">No Win</p>
                          <p className="text-muted-foreground text-xs mb-2">
                            Staked <span className="text-white font-bold">{formatCurrency(result.stake)}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mb-4">
                            Balance: <span className="text-white font-bold">{formatCurrency(result.newBalance)}</span>
                          </p>
                          <Button onClick={handleTryAgain} size="sm"
                            className="bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive hover:text-white font-bold px-5">
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile spin button */}
              <div className="lg:hidden mt-6 w-full max-w-xs">
                <Input type="number" min={minSpin} max={maxSpin} value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (KSh)"
                  className="mb-3 h-12 text-center text-lg font-bold bg-card border-border/60" />
                <Button onClick={handleSpin} disabled={spinning || showResult}
                  className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,230,92,0.4)]">
                  {spinning ? <><RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Spinning...</> : <><Sparkles className="mr-2 h-4 w-4" /> SPIN</>}
                </Button>
              </div>
            </div>

            {/* ── Control Panel ── */}
            <div className="space-y-4">
              <div className="bg-card border border-border/60 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Place Your Spin
                </h2>

                <div className="space-y-3 mb-4">
                  <label className="text-sm text-muted-foreground font-medium">Spin Amount (KSh)</label>
                  <Input type="number" min={minSpin} max={maxSpin} value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    disabled={showResult}
                    className="h-12 text-lg font-bold bg-background border-border/60 text-center" />
                  <div className="grid grid-cols-4 gap-2">
                    {[20, 50, 100, 200].map((v) => (
                      <button key={v} onClick={() => { if (!showResult) setAmount(String(v)); }}
                        disabled={showResult}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          amount === String(v)
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-white"
                        }`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential wins table */}
                <div className="space-y-2 mb-5 p-3 bg-secondary/20 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Potential payouts for KSh {Number(amount) || 0}:</p>
                  {[
                    { label: "1.5×", value: (Number(amount) * 1.5), color: "text-green-400" },
                    { label: "2×",   value: (Number(amount) * 2),   color: "text-blue-400" },
                    { label: "3×",   value: (Number(amount) * 3),   color: "text-orange-400" },
                    { label: "5×",   value: (Number(amount) * 5),   color: "text-primary" },
                    { label: "10×",  value: (Number(amount) * 10),  color: "text-yellow-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${row.color}`}>{row.label}</span>
                      <span className="font-display font-bold text-white">{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                </div>

                <Button onClick={showResult ? handleTryAgain : handleSpin}
                  disabled={spinning}
                  className={`hidden lg:flex w-full h-12 text-base font-bold transition-all hover:-translate-y-0.5 ${
                    showResult
                      ? "bg-secondary text-white hover:bg-secondary/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,230,92,0.4)] hover:shadow-[0_0_30px_rgba(0,230,92,0.6)]"
                  }`}>
                  {spinning
                    ? <><RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Spinning the wheel...</>
                    : showResult
                    ? <><RotateCcw className="mr-2 h-4 w-4" /> Try Again</>
                    : <><Sparkles className="mr-2 h-4 w-4" /> SPIN NOW</>}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Min KSh {minSpin} · Max KSh {maxSpin.toLocaleString()} per spin
                </p>
              </div>

              {/* Odds reference */}
              <div className="bg-card border border-border/50 rounded-2xl p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Wheel Segments
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "10×",   color: "text-yellow-400",       chance: "Rare" },
                    { label: "5×",    color: "text-primary",           chance: "Very low" },
                    { label: "3×",    color: "text-orange-400",        chance: "Low" },
                    { label: "2×",    color: "text-blue-400",          chance: "Uncommon" },
                    { label: "1.5×",  color: "text-green-400",         chance: "Uncommon" },
                    { label: "0.00×", color: "text-muted-foreground",  chance: "Common" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${row.color}`}>{row.label}</span>
                      <span className="text-muted-foreground">{row.chance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </UserLayout>
  );
}
