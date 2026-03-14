import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import "@/lib/fetch-interceptor"; // Import interceptor immediately to patch fetch

// Pages
import LandingPage from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminSecretLogin from "@/pages/admin-secret";
import MatchesPage from "@/pages/dashboard/matches";
import MyBetsPage from "@/pages/dashboard/my-bets";
import TransactionsPage from "@/pages/dashboard/transactions";
import LeaderboardPage from "@/pages/dashboard/leaderboard";
import NotificationsPage from "@/pages/dashboard/notifications";

// Admin Pages
import AdminOverview from "@/pages/admin/overview";
import AdminMatches from "@/pages/admin/matches";
import AdminUsers from "@/pages/admin/users";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminBets from "@/pages/admin/bets";
import AdminDeposits from "@/pages/admin/deposits";
import AdminLogs from "@/pages/admin/logs";
import AdminConfig from "@/pages/admin/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminGateway() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("isadmin") === "nutterx=true") {
      setLocation("/admin-secret");
    }
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <>
      <AdminGateway />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/admin-secret" component={AdminSecretLogin} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" component={MatchesPage} />
        <Route path="/dashboard/my-bets" component={MyBetsPage} />
        <Route path="/dashboard/transactions" component={TransactionsPage} />
        <Route path="/dashboard/notifications" component={NotificationsPage} />
        <Route path="/dashboard/leaderboard" component={LeaderboardPage} />

        {/* Admin Routes */}
        <Route path="/admin" component={AdminOverview} />
        <Route path="/admin/matches" component={AdminMatches} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/withdrawals" component={AdminWithdrawals} />
        <Route path="/admin/bets" component={AdminBets} />
        <Route path="/admin/deposits" component={AdminDeposits} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/config" component={AdminConfig} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
