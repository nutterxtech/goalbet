import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  Wallet, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  ShieldCheck
} from "lucide-react";
import { useGetNotifications, useGetBalance } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  
  // Only fetch balance and notifications if user is logged in
  const { data: balanceData } = useGetBalance({
    query: {
      enabled: !!user,
      refetchInterval: 5000
    }
  });

  const { data: notificationsData } = useGetNotifications({
    query: {
      enabled: !!user,
      refetchInterval: 5000
    }
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-6 max-w-7xl mx-auto">
        <Link href={user ? (isAdmin ? "/admin" : "/dashboard") : "/"} className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="GoalBet" className="h-8 w-8 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight text-white">Goal<span className="text-primary">Bet</span></span>
        </Link>

        <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
          {user ? (
            <>
              {/* Balance Display */}
              {!isAdmin && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm tracking-wide">
                    {formatCurrency(balanceData?.balance || user.balance || 0)}
                  </span>
                </div>
              )}

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-card">
                    <Bell className="h-5 w-5 text-muted-foreground hover:text-white transition-colors" />
                    {(notificationsData?.unreadCount ?? 0) > 0 && (
                      <span className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 border-border/50">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <span className="font-semibold">Notifications</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {notificationsData?.unreadCount || 0} New
                    </Badge>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsData?.notifications?.length ? (
                      notificationsData.notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-border/50 last:border-0 text-sm ${!n.read ? 'bg-primary/5' : ''}`}>
                          <p className={`font-medium ${!n.read ? 'text-white' : 'text-muted-foreground'}`}>{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1 opacity-70">
                            {new Date(n.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-2 sm:px-4 rounded-full sm:rounded-xl hover:bg-card border border-transparent hover:border-border transition-all">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="hidden sm:block font-medium text-sm truncate max-w-[100px]">
                        {user.username}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border/50">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  
                  {!isAdmin && (
                    <div className="sm:hidden px-2 py-1.5 mb-1">
                      <div className="flex items-center gap-2 p-2 bg-card rounded-md">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="font-display font-bold text-sm tracking-wide">
                          {formatCurrency(balanceData?.balance || user.balance || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {isAdmin ? (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer">
                        <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    </Link>
                  ) : (
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:flex font-semibold">Log in</Button>
              </Link>
              <Link href="/register">
                <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,230,92,0.3)]">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
