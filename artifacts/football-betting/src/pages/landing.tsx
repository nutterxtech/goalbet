import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Shield, ChevronRight, Gift, RefreshCw, Activity, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useRef, useState } from "react";

// Animated football that floats around
function FloatingBall({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute pointer-events-none select-none opacity-20"
      style={style}
    >
      ⚽
    </div>
  );
}

// Animated score ticker that cycles
function LiveTicker() {
  const events = [
    { min: "12'", event: "⚽ GOAL! Man City — Haaland scores!", color: "text-primary" },
    { min: "34'", event: "🟨 Yellow card — Real Madrid", color: "text-yellow-400" },
    { min: "47'", event: "⚽ GOAL! Liverpool — Salah from distance!", color: "text-primary" },
    { min: "58'", event: "🔄 Substitution — Chelsea", color: "text-muted-foreground" },
    { min: "71'", event: "⚽ GOAL! Barcelona — Lewandowski!", color: "text-primary" },
    { min: "88'", event: "🎉 Arsenal lead — 90+3 coming up!", color: "text-orange-400" },
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % events.length), 2500);
    return () => clearInterval(t);
  }, []);

  const ev = events[idx];
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <span className="text-xs font-bold text-muted-foreground mr-2">{ev.min}</span>
      <span className={`text-xs font-semibold ${ev.color}`}>{ev.event}</span>
    </div>
  );
}

// Spinning wheel preview (decorative, no interaction)
function WheelPreview() {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRotation(r => r + 1.2), 30);
    return () => clearInterval(t);
  }, []);

  const segments = [
    { label: "0.00×", color: "#1a2235" },
    { label: "1.5×",  color: "#14532d" },
    { label: "0.00×", color: "#1e1b2e" },
    { label: "2×",    color: "#1e3a5f" },
    { label: "0.00×", color: "#1a2235" },
    { label: "3×",    color: "#7c2d12" },
    { label: "0.00×", color: "#1e1b2e" },
    { label: "5×",    color: "#14532d" },
    { label: "0.00×", color: "#1a2235" },
    { label: "1.5×",  color: "#312e81" },
    { label: "0.00×", color: "#1e1b2e" },
    { label: "10×",   color: "#713f12" },
  ];
  const N = segments.length;
  const SLICE = 360 / N;

  function polar(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function path(cx: number, cy: number, r: number, s: number, e: number) {
    const sp = polar(cx, cy, r, s);
    const ep = polar(cx, cy, r, e);
    return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 0 1 ${ep.x} ${ep.y} Z`;
  }

  return (
    <div className="relative w-36 h-36 mx-auto">
      {/* Pointer */}
      <div
        className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-10 w-0 h-0"
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "18px solid #00e65c",
        }}
      />
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "100px 100px" }}>
          {segments.map((seg, i) => {
            const s = i * SLICE, e = s + SLICE;
            const mid = s + SLICE / 2;
            const tp = polar(100, 100, 65, mid);
            return (
              <g key={i}>
                <path d={path(100, 100, 96, s, e)} fill={seg.color} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <text x={tp.x} y={tp.y} fill="rgba(255,255,255,0.7)" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}>{seg.label}</text>
              </g>
            );
          })}
        </g>
        <circle cx={100} cy={100} r={14} fill="#0d0d1a" stroke="rgba(0,230,92,0.5)" strokeWidth="2" />
        <text x={100} y={100} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#00e65c">⚽</text>
      </svg>
    </div>
  );
}

export default function LandingPage() {
  // Floating balls config
  const floatingBalls = [
    { fontSize: "2rem", left: "5%",  top: "15%", animationDuration: "3.2s", animationDelay: "0s" },
    { fontSize: "1.5rem", left: "88%", top: "8%",  animationDuration: "2.8s", animationDelay: "0.5s" },
    { fontSize: "1.2rem", left: "15%", top: "70%", animationDuration: "3.5s", animationDelay: "1s" },
    { fontSize: "2.5rem", left: "80%", top: "60%", animationDuration: "2.5s", animationDelay: "1.5s" },
    { fontSize: "1rem",   left: "50%", top: "5%",  animationDuration: "4s",   animationDelay: "0.8s" },
    { fontSize: "1.8rem", left: "92%", top: "40%", animationDuration: "3s",   animationDelay: "0.3s" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4 flex-1 flex items-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Stadium lights" 
            className="w-full h-full object-cover opacity-30 object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background hidden md:block" />
        </div>

        {/* Floating footballs */}
        {floatingBalls.map((b, i) => (
          <FloatingBall
            key={i}
            style={{
              fontSize: b.fontSize,
              left: b.left,
              top: b.top,
              animation: `bounce ${b.animationDuration} ease-in-out infinite`,
              animationDelay: b.animationDelay,
              zIndex: 1,
            }}
          />
        ))}

        {/* Animated green radial pulse */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/8 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6 backdrop-blur-sm animate-pulse">
              <Zap className="mr-2 h-4 w-4" /> The Future of Virtual Betting
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Bet on <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">Virtual Matches.</span><br />
              Win Real Cash.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Experience the thrill of simulated 90-minute football matches played out in just 120 seconds. 
              Place your bets, spin the lucky wheel, and cash out instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(0,230,92,0.4)] hover:shadow-[0_0_40px_rgba(0,230,92,0.6)] hover:-translate-y-1 transition-all rounded-xl w-full sm:w-auto">
                  Start Betting Now <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-border bg-card/50 backdrop-blur-sm hover:bg-card rounded-xl w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
            
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Secure Platform</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Instant Payouts</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Lucky Wheel</div>
            </div>
          </div>
          
          {/* Hero Decorative Card */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Live ticker bar */}
              <div className="bg-background/60 border border-border/40 rounded-xl px-4 py-2 mb-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                <LiveTicker />
              </div>

              <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-destructive font-bold text-sm">LIVE 75'</span>
                </div>
                <span className="font-display font-bold">Premier League Sim</span>
              </div>
              
              <div className="flex justify-between items-center mb-8">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-3 border border-border">
                    <span className="font-bold text-xl">MCI</span>
                  </div>
                  <span className="font-semibold text-sm">Man City</span>
                </div>
                
                <div className="text-center px-4">
                  <span className="text-5xl font-display font-black text-primary">3 - 1</span>
                  <div className="text-xs text-muted-foreground mt-1 animate-pulse">● LIVE</div>
                </div>
                
                <div className="text-center flex-1">
                  <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-3 border border-border">
                    <span className="font-bold text-xl">ARS</span>
                  </div>
                  <span className="font-semibold text-sm">Arsenal</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50 opacity-50">
                  <span className="block text-xs text-muted-foreground mb-1">Home</span>
                  <span className="font-bold text-lg">1.45</span>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50 opacity-50">
                  <span className="block text-xs text-muted-foreground mb-1">Draw</span>
                  <span className="font-bold text-lg">4.20</span>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50 opacity-50">
                  <span className="block text-xs text-muted-foreground mb-1">Away</span>
                  <span className="font-bold text-lg">6.50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-card/30 border-t border-border relative overflow-hidden">
        {/* Decorative ball */}
        <div className="absolute right-8 top-8 text-6xl opacity-5 rotate-12">⚽</div>
        <div className="absolute left-4 bottom-4 text-4xl opacity-5 -rotate-12">🏆</div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A seamless betting experience designed for speed and excitement.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Trophy,
                title: "1. Choose Your Match",
                desc: "Browse live and upcoming simulated matches featuring top European teams with algorithmically generated odds."
              },
              {
                icon: Zap,
                title: "2. Fast-Paced Action",
                desc: "Matches simulate 90 minutes of gameplay in just 120 seconds. Watch the live ticker update with goals and events."
              },
              {
                icon: Shield,
                title: "3. Instant Winnings",
                desc: "Winnings are calculated instantly and credited to your account. Withdraw your funds via M-Pesa at any time."
              },
              {
                icon: RefreshCw,
                title: "4. 50% Refund on Loss",
                desc: "Lost your bet? We refund 50% of your stake straight back to your wallet — automatically, every single time."
              }
            ].map((feature, i) => (
              <div key={i} className={`bg-card border rounded-2xl p-8 hover:border-primary/50 transition-all hover:-translate-y-1 group ${i === 3 ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${i === 3 ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                {i === 3 && <div className="mt-4 inline-flex items-center text-primary text-xs font-bold bg-primary/10 px-3 py-1 rounded-full">✓ Automatic — no claim needed</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lucky Wheel Feature Section */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,92,0.07)_0%,_transparent_65%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Sparkles className="mr-2 h-4 w-4" /> New Feature
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                Spin the <span className="text-primary">Lucky Wheel</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Feeling lucky? Enter any amount, give the wheel a spin, and watch where the arrow lands. 
                Hit a multiplier — 1.5×, 2×, 3×, 5×, or the legendary <span className="text-yellow-400 font-bold">10×</span> — 
                and your money multiplies instantly. Land on 0.00×... better luck next time!
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                {[
                  { mult: "10×", label: "Max multiplier", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
                  { mult: "5×",  label: "Big win",         color: "text-primary",    bg: "bg-primary/10 border-primary/20" },
                  { mult: "KSh 10", label: "Min spin",     color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
                ].map((s) => (
                  <div key={s.mult} className={`border rounded-xl p-4 text-center ${s.bg}`}>
                    <div className={`text-2xl font-display font-black ${s.color} mb-1`}>{s.mult}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,230,92,0.4)] rounded-xl">
                  <Sparkles className="mr-2 h-4 w-4" /> Spin Now — Sign Up Free
                </Button>
              </Link>
            </div>
            {/* Animated wheel preview */}
            <div className="flex flex-col items-center gap-6">
              <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl p-8 shadow-2xl hover:border-primary/30 transition-all">
                <WheelPreview />
                <div className="text-center mt-4">
                  <p className="text-sm font-bold text-white mb-1">🎯 Arrow stops — fate decides</p>
                  <p className="text-xs text-muted-foreground">Multipliers up to 10× your stake</p>
                </div>
              </div>
              {/* Segment preview */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: "0.00×", color: "bg-secondary text-muted-foreground" },
                  { label: "1.5×",  color: "bg-green-500/20 text-green-400" },
                  { label: "2×",    color: "bg-blue-500/20 text-blue-400" },
                  { label: "3×",    color: "bg-orange-500/20 text-orange-400" },
                  { label: "5×",    color: "bg-primary/20 text-primary" },
                  { label: "10×",   color: "bg-yellow-500/20 text-yellow-400" },
                ].map(s => (
                  <span key={s.label} className={`px-3 py-1 rounded-full text-xs font-bold border border-transparent ${s.color}`}>{s.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 border-t border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,230,92,0.06)_0%,_transparent_60%)]" />
        {/* Animated pitch lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
          <div className="absolute w-full h-0.5 bg-primary top-1/2 transform -translate-y-1/2" />
          <div className="absolute w-32 h-32 rounded-full border-2 border-primary top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
              <Activity className="mr-2 h-4 w-4" /> Live Dashboard
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Everything at a glance</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Watch live matches tick in real time, build your accumulator slip, and track your winnings — all in one place.
            </p>
          </div>

          {/* Mock Dashboard */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full scale-75" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl overflow-hidden shadow-2xl">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-4 py-1.5 rounded-full border border-border/40">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  goalbet.app/dashboard
                </div>
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-xs font-display font-bold text-primary">KSh 1,240</span>
                </div>
              </div>

              {/* Tab row */}
              <div className="flex gap-2 px-6 py-3 border-b border-border/40 bg-background/40">
                {["Live", "Upcoming", "Results"].map((tab, i) => (
                  <div key={tab} className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === 0 ? "bg-secondary text-white" : "text-muted-foreground"}`}>
                    {tab}
                    {i === 0 && <span className="ml-2 inline-flex items-center gap-1 text-destructive font-bold"><span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse inline-block" />5</span>}
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1fr_300px] divide-x divide-border/40">
                {/* Match list */}
                <div className="divide-y divide-border/30">
                  {[
                    { home: "Man City", away: "Arsenal", hs: 2, as: 1, min: 67, hodd: 1.45, dodd: 4.20, aodd: 6.50 },
                    { home: "Real Madrid", away: "Barcelona", hs: 1, as: 1, min: 34, hodd: 2.10, dodd: 3.40, aodd: 3.20 },
                    { home: "Liverpool", away: "Chelsea", hs: 0, as: 0, min: 12, hodd: 1.80, dodd: 3.60, aodd: 4.50 },
                  ].map((m, i) => (
                    <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors cursor-pointer">
                      <div className="flex items-center gap-1 min-w-[52px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-[10px] text-destructive font-bold">{m.min}'</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{m.home}</span>
                        <span className="text-xl font-display font-black text-primary px-3">{m.hs} - {m.as}</span>
                        <span className="text-sm font-semibold text-white">{m.away}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {[{ label: "1", odd: m.hodd }, { label: "X", odd: m.dodd }, { label: "2", odd: m.aodd }].map(o => (
                          <div key={o.label} className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${i === 0 && o.label === "1" ? "bg-primary/20 border-primary text-primary" : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}>
                            <span className="text-[9px] opacity-60">{o.label}</span>
                            <span className="font-bold">{o.odd.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bet slip */}
                <div className="p-5 bg-background/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm">Bet Slip</h3>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">1 Selection</span>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-3 mb-3 border border-border/40">
                    <p className="text-[10px] text-muted-foreground mb-1">Man City vs Arsenal</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Man City Win</span>
                      <span className="text-xs font-display font-black text-primary">1.45×</span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="font-bold text-white">KSh 200</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Potential Win</span>
                      <span className="font-display font-bold text-primary">KSh 290</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-border/40 pt-2">
                      <span className="text-muted-foreground">If Lost (50% back)</span>
                      <span className="font-bold text-yellow-400">KSh 100</span>
                    </div>
                  </div>
                  <div className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl text-center">
                    Place Bet
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground mt-3">Min bet KSh 5 · 50% refund guaranteed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Section */}
      <section className="py-24 border-t border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,92,0.08)_0%,_transparent_70%)]" />
        {/* Decorative balls */}
        <div className="absolute top-10 right-10 text-5xl opacity-5 animate-spin" style={{ animationDuration: "20s" }}>⚽</div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            <Gift className="mr-2 h-4 w-4" /> Refer & Earn
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Share the wins, earn together</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
            Every time a friend signs up using your personal referral link, they get started and you earn <span className="text-primary font-bold">KSh 5</span> instantly — no limits, no caps.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Get your link", desc: "Find your unique referral code in your dashboard after signing up." },
              { step: "02", title: "Invite friends", desc: "Share your link via WhatsApp, SMS, or social media." },
              { step: "03", title: "Earn KSh 5", desc: "Get KSh 5 credited to your wallet every time a friend joins." },
            ].map((item) => (
              <div key={item.step} className="bg-card border border-border/50 rounded-2xl p-6 text-left hover:border-primary/40 hover:-translate-y-1 transition-all">
                <div className="text-4xl font-display font-black text-primary/30 mb-3">{item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/register">
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                Join &amp; Start Referring <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card/50 border-t border-border relative overflow-hidden">
        {/* Animated field center circle */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-primary" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary" />
          <div className="absolute w-full h-0.5 bg-primary top-1/2 -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "120s", label: "Match Duration", icon: "⏱" },
              { value: "KSh 5", label: "Min Bet", icon: "💰" },
              { value: "KSh 20", label: "Min Deposit", icon: "📲" },
              { value: "50%", label: "Refund on Loss", icon: "🔄" },
            ].map((stat) => (
              <div key={stat.label} className="group">
                <div className="text-3xl mb-2 group-hover:animate-bounce">{stat.icon}</div>
                <div className="text-4xl md:text-5xl font-display font-black text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="GoalBet" className="h-6 w-6 object-contain grayscale opacity-50" />
            <span className="font-display font-bold text-lg text-muted-foreground">GoalBet</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} GoalBet Virtual Sports. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-muted-foreground font-medium">
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Responsible Gaming</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
