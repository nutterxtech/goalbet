import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Shield, ChevronRight, Gift, RefreshCw, Activity } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4 flex-1 flex items-center">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Stadium lights" 
            className="w-full h-full object-cover opacity-30 object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background hidden md:block"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6 backdrop-blur-sm">
              <Zap className="mr-2 h-4 w-4" /> The Future of Virtual Betting
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Bet on <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">Virtual Matches.</span><br />
              Win Real Cash.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Experience the thrill of simulated 90-minute football matches played out in just 120 seconds. 
              Place your bets, watch the live action unfold, and cash out instantly.
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
            
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Secure Platform</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Instant Payouts</div>
            </div>
          </div>
          
          {/* Hero Decorative Card */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
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
      <section className="py-24 bg-card/30 border-t border-border">
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
              <div key={i} className={`bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors group ${i === 3 ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
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

      {/* Dashboard Preview Section */}
      <section className="py-24 border-t border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,230,92,0.06)_0%,_transparent_60%)]" />
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
              <div key={item.step} className="bg-card border border-border/50 rounded-2xl p-6 text-left hover:border-primary/40 transition-colors">
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
      <section className="py-16 bg-card/50 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "120s", label: "Match Duration" },
              { value: "KSh 5", label: "Min Bet" },
              { value: "KSh 20", label: "Min Deposit" },
              { value: "50%", label: "Refund on Loss" },
            ].map((stat) => (
              <div key={stat.label}>
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
