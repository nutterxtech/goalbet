import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, History, ArrowLeftRight, Activity } from "lucide-react";
import { Navbar } from "./Navbar";

const navItems = [
  { href: "/dashboard", label: "Matches", icon: Activity },
  { href: "/dashboard/my-bets", label: "My Bets", icon: History },
  { href: "/dashboard/transactions", label: "Wallet", icon: ArrowLeftRight },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function UserLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer whitespace-nowrap
                    ${isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(0,230,92,0.05)]" 
                      : "text-muted-foreground hover:text-white hover:bg-card border border-transparent"}
                  `}>
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "opacity-70"}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
      </main>
    </div>
  );
}
