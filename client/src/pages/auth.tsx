import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getClientRoleRedirectPath } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Loader2, ShoppingBag } from "lucide-react";

const authSchema = z.object({
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[^\s]+$/, "Username cannot contain spaces"),
  password: z.string()
    .min(4, "Password must be at least 4 characters"),
  districtId: z.string().min(1, "District is required"),
});

const getAuthMode = (): string => {
  if (typeof window === 'undefined') return "customer";
  try {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    return roleParam === "partner" || roleParam === "vendor" ? "partner" : "customer";
  } catch (e) {
    return "customer";
  }
};

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return "login";
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "register" ? "register" : "login";
  } catch (e) {
    return "login";
  }
};

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  
  // Track active tab only for knowing which API to hit, NOT for controlling the Tabs component!
  // Use constant default - initialize from URL in useEffect
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Initialize tab from URL on mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") {
      setActiveTab("register");
    }
  }, []);
  const [loading, setLoading] = useState(false);
  
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  
  const authMode = getAuthMode();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "", districtId: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setFetching(true);
        console.log("🛰️ Fetching districts from /api/districts...");
        const res = await fetch('/api/districts');
        const result = await res.json();
        
        // 🛡️ CRITICAL FIX: Check for result.data because backend sends { success: true, data: [...] }
        if (result.success && Array.isArray(result.data)) {
          setDistricts(result.data);
          console.log("✅ Districts Synced:", result.data);
        } else {
          console.error("⚠️ Backend sent unexpected format:", result);
        }
      } catch (err) {
        console.error("❌ Network Error while fetching districts:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchDistricts();
  }, []);

  const hasCheckedAuth = useRef(false);

  // Initial Auth Check - Use Hard Redirect to avoid React Router loops
  // GUARD: Don't run if we're in the middle of a login/register submission
  const isSubmittingRef = useRef(false);
  
  useEffect(() => {
    // Skip if not on auth page, already checked, or currently submitting
    if (location !== "/auth" || authLoading || hasCheckedAuth.current || isSubmittingRef.current) return;
    
    // Only rely on isAuthenticated from AuthContext - don't check localStorage!
    if (isAuthenticated && user) {
      hasCheckedAuth.current = true;
      // ✅ Use utility function for role-based redirect
      const target = getClientRoleRedirectPath(user);
      console.log("🛠️ [DEBUG] Login Redirect Target:", target);
      setLocation(target);
    }
  }, [location, isAuthenticated, user, authLoading, setLocation]);

  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    console.log("🔵 [AUTH] [SUBMIT] Form submitted for:", activeTab);
    setLoading(true);
    isSubmittingRef.current = true; // Guard: prevent useEffect from redirecting during submission
    
    try {
      const url = `/api/auth/${activeTab === "login" ? "login" : "register"}`;
      const userRole = authMode === "partner" ? "seller" : "customer";
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          username: data.username.trim(), 
          password: data.password,
          role: userRole,
          districtId: data.districtId
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || '900', 10);
        setRateLimitRemaining(retryAfter);
        setIsRateLimited(true);
        toast({
          variant: "destructive",
          title: "बहुत ज्यादा कोशिशें!",
          description: `कृपया ${Math.ceil(retryAfter / 60)} मिनट बाद कोशिश करें।`,
        });
        setLoading(false);
        return;
      }
      
      const contentType = response.headers.get("content-type");
      let result;
      
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result.message || `Request failed: ${response.status}`);
      }
      
      // Token is in httpOnly cookie - browser handles it automatically via credentials: 'include'
      // NO localStorage token storage - pure cookie-based authentication
      const userData = result.user || result;
      
      if (!userData) {
        throw new Error('Login failed: No user data received');
      }
      
      const isAdminUser = userData.role?.toLowerCase() === "admin" || userData.role === "SUPER_ADMIN" || userData.role === "superadmin" || userData.isAdmin === true;
      const isVendorUser = userData.role?.toLowerCase() === "seller" || userData.role === "MERCHANT" || userData.isVendor === true;
      
      const userToStore = {
        id: userData.id, username: userData.username,
        role: userData.role, 
        isAdmin: isAdminUser,
        isVendor: isVendorUser
      };

      // Store user data in localStorage (token is in httpOnly cookie)
      localStorage.setItem("user", JSON.stringify(userToStore));
      
      const districtIdFromUser = Number((userToStore as any)?.districtId);
      if (Number.isInteger(districtIdFromUser) && districtIdFromUser > 0) {
        localStorage.setItem("districtId", String(districtIdFromUser));
      } else if (!localStorage.getItem("districtId")) {
        localStorage.setItem("districtId", "3");
      }
      
      // ✅ Use utility function for role-based redirect - pass userToStore with computed isAdmin property
      const target = getClientRoleRedirectPath(userToStore);
      console.log("🛠️ [DEBUG] Login Redirect Target:", target);
      
      window.location.href = target; 
      // Do NOT set loading to false here, let the browser handle the navigation
      
    } catch (error: any) {
      console.error("❌ [AUTH] Error:", error);
      toast({
        variant: "destructive",
        title: "Gadbad ho gayi",
        description: error.message || "Login failed. Please try again.",
      });
      setLoading(false); 
    }
  };

  const isPartnerMode = authMode === "partner";
  const IconComponent = isPartnerMode ? Store : ShoppingBag;

  return (
    <div className="min-h-screen bg-deep orange-nebula-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle orange gradient pulse */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-transparent animate-orange-pulse pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-orange-600/20 backdrop-blur-md mb-4 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <IconComponent className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            {isPartnerMode ? "Partner Portal" : "Shahdol Bazaar"}
          </h1>
          <p className="text-slate-400 mt-2 font-medium">
            {isPartnerMode ? "अपना स्टोर मैनेज करें" : "Your local marketplace"}
          </p>
        </div>

        {/* FIX: Use state value for stability - prevent function call on every render */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Welcome Back!</CardTitle>
                <CardDescription>अपना खाता खोलें और जारी रखें</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Username" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Password" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {isRateLimited && rateLimitRemaining !== null && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-center backdrop-blur-md">
                        <p className="text-red-400 font-medium mb-2">⚠️ बहुत ज्यादा कोशिशें!</p>
                        <div className="text-3xl font-black text-red-400">
                          {Math.floor(rateLimitRemaining / 60)}:{String(rateLimitRemaining % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full btn-neon-primary" disabled={loading || isRateLimited}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> कृपया प्रतीक्षा करें...</> : "Login"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  {isPartnerMode ? "अपना स्टोर बनाएं और बिक्री शुरू करें" : "Join Shahdol Bazaar today"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="districtId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select District</FormLabel>
                          <FormControl>
                            <select 
                              {...field}
                              className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-orange-500/50 appearance-none cursor-pointer"
                              onChange={(e) => form.setValue("districtId", e.target.value)}
                            >
                              <option value="" className="bg-black">-- चुनें अपना जिला --</option>
                              {districts.map((d) => (
                                <option key={d.id} value={d.id.toString()} className="bg-black">
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          {fetching && <p className="text-[10px] text-orange-500 animate-pulse">Loading cities...</p>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full btn-neon-primary" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> कृपया प्रतीक्षा करें...</> : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>By continuing, you agree to our</p>
          <div className="flex justify-center gap-2 mt-1">
            <a href="/terms" className="hover:underline text-orange-400">Terms</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:underline text-orange-400">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}