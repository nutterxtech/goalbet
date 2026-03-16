import { UserLayout } from "@/components/layout/UserLayout";
import { useGetNotifications, useMarkNotificationsRead } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Loader2, Bell, BellOff, CheckCheck, TrendingUp, TrendingDown, Wallet, ArrowUpFromLine, Receipt, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function typeIcon(type: string) {
  switch (type) {
    case "bet_won":    return { Icon: TrendingUp,       bg: "bg-green-500/15",  border: "border-green-500/30",  iconColor: "text-green-400",   label: "Win",       dot: "bg-green-500" };
    case "bet_lost":   return { Icon: TrendingDown,     bg: "bg-red-500/15",    border: "border-red-500/30",    iconColor: "text-red-400",     label: "Loss",      dot: "bg-red-500" };
    case "deposit":    return { Icon: Wallet,           bg: "bg-sky-500/15",    border: "border-sky-500/30",    iconColor: "text-sky-400",     label: "Deposit",   dot: "bg-sky-500" };
    case "withdrawal": return { Icon: ArrowUpFromLine,  bg: "bg-amber-500/15",  border: "border-amber-500/30",  iconColor: "text-amber-400",   label: "Withdraw",  dot: "bg-amber-500" };
    case "bet_placed": return { Icon: Receipt,          bg: "bg-violet-500/15", border: "border-violet-500/30", iconColor: "text-violet-400",  label: "Bet Slip",  dot: "bg-violet-500" };
    default:           return { Icon: Info,             bg: "bg-secondary/40",  border: "border-border/40",     iconColor: "text-muted-foreground", label: "Notice", dot: "bg-muted-foreground" };
  }
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetNotifications({ query: { refetchInterval: 15000 } });
  const markRead = useMarkNotificationsRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user/notifications"] }) },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <UserLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white leading-none">Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markRead.mutate()} disabled={markRead.isPending}
            className="border-border/50 text-muted-foreground hover:text-white h-9 self-start sm:self-auto">
            {markRead.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card/40 border border-dashed border-border/50 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <BellOff className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-muted-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Place a bet to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, idx) => {
            const t = typeIcon(n.type);
            const Icon = t.Icon;
            return (
              <div key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  !n.read
                    ? `${t.bg} ${t.border}`
                    : "bg-card/50 border-border/30 hover:border-border/50"
                }`}>
                {/* Colored icon */}
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${
                  !n.read ? `${t.bg} ${t.border}` : "bg-secondary/40 border-border/40"
                }`}>
                  <Icon className={`w-5 h-5 ${!n.read ? t.iconColor : "text-muted-foreground"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${!n.read ? t.iconColor : "text-muted-foreground"}`}>
                        {t.label}
                      </span>
                      <p className={`text-sm leading-snug mt-0.5 ${!n.read ? "text-white font-medium" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${t.dot}`} />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </UserLayout>
  );
}
