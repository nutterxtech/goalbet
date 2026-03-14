import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMe, 
  login as apiLogin, 
  register as apiRegister,
  LoginRequest,
  RegisterRequest,
  UserProfile,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("goalbet_token"));
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only fetch user if we have a token
  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 mins
    }
  });

  useEffect(() => {
    if (error) {
      // If token is invalid, clear it
      logout(false);
    }
  }, [error]);

  const login = async (data: LoginRequest) => {
    try {
      const res = await apiLogin(data);
      localStorage.setItem("goalbet_token", res.token);
      setToken(res.token);
      queryClient.setQueryData(getGetMeQueryKey(), res.user);
      
      toast({
        title: "Welcome back!",
        description: "Login successful.",
      });
      
      if (res.user.role === 'admin') {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive"
      });
      throw err;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const res = await apiRegister(data);
      localStorage.setItem("goalbet_token", res.token);
      setToken(res.token);
      queryClient.setQueryData(getGetMeQueryKey(), res.user);
      
      toast({
        title: "Account created!",
        description: "Welcome to GoalBet.",
      });
      
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Could not create account",
        variant: "destructive"
      });
      throw err;
    }
  };

  const logout = (redirect = true) => {
    localStorage.removeItem("goalbet_token");
    setToken(null);
    queryClient.clear();
    if (redirect) {
      setLocation("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isLoading && !!token,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
