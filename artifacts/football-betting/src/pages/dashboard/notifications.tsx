import { UserLayout } from "@/components/layout/UserLayout";
import { useGetNotifications, useMarkNotificationsRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { Loader2, Bell, BellOff, CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetNotifications({ query: { refetchInterval: 15000 } });
  const markReadMutation = useMarkNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
      },
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bet_won": return "border-l-green-500";
      case "bet_lost": return "border-l-red-500";
      case "deposit": return "border-l-blue-500";
      case "withdrawal": return "border-l-yellow-500";
      case "bet_placed": return "border-l-primary";
      default: return "border-l-muted-foreground";
    }
  };

  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay up to date with your bets and activity.</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
          >
            {markReadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-dashed border-border rounded-2xl">
          <BellOff className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No notifications yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Bet on a match to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`border-border/50 bg-card/80 backdrop-blur border-l-4 ${getTypeColor(n.type)} ${
                !n.read ? "bg-primary/5 border-border/80" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className={`text-sm ${!n.read ? "text-white font-medium" : "text-muted-foreground"}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </UserLayout>
  );
}
