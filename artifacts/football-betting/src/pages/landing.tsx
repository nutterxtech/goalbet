import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Shield, ChevronRight, Gift } from "lucide-react";
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
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Trophy,
                title: "1. Choose Your Match",
                desc: "Browse our schedule of upcoming simulated matches featuring top European teams with algorithmically generated odds."
              },
              {
                icon: Zap,
                title: "2. Fast-Paced Action",
                desc: "Matches simulate 90 minutes of gameplay in just 120 seconds. Watch the timeline update live with goals and events."
              },
              {
                icon: Shield,
                title: "3. Instant Winnings",
                desc: "Winnings are calculated instantly and credited to your account. Withdraw your funds securely at any time."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-8 hover:border-primary/50 transition-colors group">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
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
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { value: "120s", label: "Match Duration" },
              { value: "KSh 5", label: "Min Bet" },
              { value: "KSh 20", label: "Min Deposit" },
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
