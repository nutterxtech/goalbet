import { useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { useGetTransactions, useDeposit, useWithdraw } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TransactionsPage() {
  const { data, isLoading } = useGetTransactions({ page: 1, limit: 50 });
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <UserLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your funds and transaction history.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setDepositOpen(true)}>
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit
          </Button>
          <Button className="bg-white text-black hover:bg-gray-200" onClick={() => setWithdrawOpen(true)}>
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.transactions.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/50 hover:bg-secondary/20">
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-xs font-bold tracking-wider">{tx.type}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className={tx.status === 'completed' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </UserLayout>
  );
}

function DepositModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState("100");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useDeposit({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deposit Successful", description: "Funds added to your account." });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
        onOpenChange(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>Add funds to your GoalBet wallet (Min KSh 20)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input 
            type="number" 
            placeholder="Amount" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg h-12"
          />
          <Button 
            className="w-full h-12" 
            onClick={() => mutation.mutate({ data: { amount: parseFloat(amount) } })}
            disabled={mutation.isPending || parseFloat(amount) < 20}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deposit {amount && !isNaN(parseFloat(amount)) ? formatCurrency(parseFloat(amount)) : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useWithdraw({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal Requested", description: "Your request is pending admin approval." });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
        onOpenChange(false);
        setAmount("");
        setDetails("");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  });

  const numAmount = parseFloat(amount) || 0;
  const netAmount = numAmount * 0.88; // 12% fee

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>Withdraw your winnings (Min KSh 50). A 12% platform fee applies.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Amount (KSh)</label>
            <Input 
              type="number" 
              placeholder="e.g. 500" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          {numAmount >= 50 && (
            <div className="p-3 bg-secondary/50 rounded-lg text-sm border border-border/50">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Requested Amount:</span>
                <span>{formatCurrency(numAmount)}</span>
              </div>
              <div className="flex justify-between text-destructive mb-2">
                <span>Platform Fee (12%):</span>
                <span>-{formatCurrency(numAmount * 0.12)}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-border">
                <span>You will receive:</span>
                <span className="text-primary">{formatCurrency(netAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Payment Details (e.g. M-PESA Number)</label>
            <Textarea 
              placeholder="Enter your mobile number or bank details" 
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={() => mutation.mutate({ data: { amount: numAmount, accountDetails: details } })}
            disabled={mutation.isPending || numAmount < 50 || !details.trim()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
