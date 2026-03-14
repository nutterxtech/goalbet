import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, Trophy, DollarSign, 
  Activity, Settings, ClipboardList, ShieldAlert
} from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/hooks/use-auth";

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/matches", label: "Matches", icon: Trophy },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: DollarSign },
  { href: "/admin/bets", label: "All Bets", icon: Activity },
  { href: "/admin/deposits", label: "Deposits", icon: DollarSign },
  { href: "/admin/logs", label: "System Logs", icon: ClipboardList },
  { href: "/admin/config", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have permission to view this area.</p>
        <Link href="/dashboard" className="text-primary hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="border-b border-destructive/20 bg-destructive/5 text-destructive/80 text-xs py-1.5 text-center font-medium uppercase tracking-widest">
        Admin Mode Active
      </div>
      
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="bg-card border border-border/50 rounded-2xl p-3 shadow-lg shadow-black/20 sticky top-24">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible hide-scrollbar">
              {adminNavItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 cursor-pointer text-sm whitespace-nowrap
                      ${isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground hover:text-white hover:bg-white/5"}
                    `}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "opacity-70"}`} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
      </main>
    </div>
  );
}
