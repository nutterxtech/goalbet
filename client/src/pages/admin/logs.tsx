import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const actionColors: Record<string, string> = {
  CREATE_MATCH: "bg-blue-500/20 text-blue-400",
  START_MATCH: "bg-green-500/20 text-green-400",
  STOP_MATCH: "bg-red-500/20 text-red-400",
  OVERRIDE_RESULT: "bg-orange-500/20 text-orange-400",
  UPDATE_ODDS: "bg-purple-500/20 text-purple-400",
  OPEN_BETTING: "bg-cyan-500/20 text-cyan-400",
  UPDATE_USER_STATUS: "bg-yellow-500/20 text-yellow-400",
  ADJUST_BALANCE: "bg-pink-500/20 text-pink-400",
  APPROVE_WITHDRAWAL: "bg-green-500/20 text-green-400",
  REJECT_WITHDRAWAL: "bg-red-500/20 text-red-400",
  UPDATE_CONFIG: "bg-indigo-500/20 text-indigo-400",
};

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminGetLogs({ page, limit: 30 });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">All admin actions and system events</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white">Logs ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-3 px-2">Action</th>
                  <th className="text-left py-3 px-2">Admin</th>
                  <th className="text-left py-3 px-2">Description</th>
                  <th className="text-left py-3 px-2">Target</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No logs found</td></tr>
                ) : (
                  data?.logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="py-3 px-2">
                        <Badge className={`text-xs ${actionColors[log.action] || "bg-gray-500/20 text-gray-400"}`}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-primary font-medium">{log.adminUsername}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs max-w-xs truncate">{log.description}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{log.targetType || "-"}</td>
                      <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-muted-foreground text-sm">Page {page} of {data?.totalPages ?? 1}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 bg-card border border-border/50 rounded text-sm text-white disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}
                className="px-3 py-1 bg-card border border-border/50 rounded text-sm text-white disabled:opacity-40">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
