import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

export default function Register() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Pick up referral code from URL param
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", phone: "", referralCode: refFromUrl },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      await register(values);
    } catch (error) {
      // Error handled by AuthProvider
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 text-center pt-8">
          <Link href="/">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-12 h-12 mx-auto mb-4 cursor-pointer hover:opacity-80" />
          </Link>
          <CardTitle className="text-3xl font-display font-bold">Create Account</CardTitle>
          <CardDescription>Join GoalBet and start winning today</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="betking99" {...field} className="bg-background h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} className="bg-background h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+254..." {...field} className="bg-background h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-primary" /> Referral Code
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="FRIEND123" {...field} className="bg-background h-11 uppercase" onChange={e => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    {field.value && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Your friend earns KSh 5 when you join!
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 font-bold text-md mt-2 text-primary-foreground" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          </Form>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
