import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetUsers, useAdminUpdateUserStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function AdminUsers() {
  const { data, isLoading } = useAdminGetUsers({ page: 1, limit: 100 });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusMutation = useAdminUpdateUserStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "User status updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      }
    }
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Users</h1>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50">
                  <TableHead>Joined</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : data?.users.map((user) => (
                  <TableRow key={user.id} className="border-border/50">
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.role === 'admin' ? 'border-primary text-primary' : ''}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(user.balance)}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={user.status === 'active' ? 'bg-success text-black' : ''}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.status === 'active' ? (
                        <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: user.id, data: { status: 'suspended', reason: 'Admin action' } })}>
                          Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-success border-success hover:bg-success hover:text-black" onClick={() => statusMutation.mutate({ id: user.id, data: { status: 'active', reason: 'Admin action' } })}>
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
