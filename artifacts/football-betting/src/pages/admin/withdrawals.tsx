import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetWithdrawals, useAdminProcessWithdrawal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function AdminWithdrawals() {
  const { data, isLoading } = useAdminGetWithdrawals({ status: "pending" }, { query: { refetchInterval: 10000 } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const processMutation = useAdminProcessWithdrawal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal processed" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      }
    }
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Pending Withdrawals</h1>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50">
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : data?.transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending withdrawals.</TableCell></TableRow>
                ) : data?.transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/50">
                    <TableCell className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                    <TableCell className="font-medium">{tx.username}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell className="font-mono font-bold text-primary">{formatCurrency(tx.netAmount || (tx.amount * 0.88))}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-primary/10 text-primary border-primary hover:bg-primary hover:text-black"
                          onClick={() => processMutation.mutate({ id: tx.id, data: { action: 'approve' } })}
                          disabled={processMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => processMutation.mutate({ id: tx.id, data: { action: 'reject' } })}
                          disabled={processMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
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
