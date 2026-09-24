import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api-client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Store, Loader2, ShoppingBag, HelpCircle, KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
  districtId: z.string().optional(),
});

const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username: letters, numbers, -_ only"),
  password: z.string()
    .min(12, "Minimum 12 characters required")
    .regex(/[A-Z]/, "One uppercase letter required")
    .regex(/[a-z]/, "One lowercase letter required")
    .regex(/[0-9]/, "One number required")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "One special character required"),
  districtId: z.string().optional(),
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

const getReturnUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ret = params.get("return") || params.get("redirect") || params.get("returnUrl");
    if (!ret) return null;
    const trimmed = ret.trim();
    // Must start with / and not //, and must not contain : to prevent javascript:, data:, or protocol schemes
    if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes(":")) {
      return trimmed;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, loading: authLoading, setUserData, logout } = useAuth();

  // 🔐 Phase 1 Recovery & Forced Password Change State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isForceChangeOpen, setIsForceChangeOpen] = useState(false);
  const [forceChangeCurrent, setForceChangeCurrent] = useState("");
  const [forceChangeNew, setForceChangeNew] = useState("");
  const [forceChangeConfirm, setForceChangeConfirm] = useState("");
  const [forceChangeLoading, setForceChangeLoading] = useState(false);
  const [forceChangeError, setForceChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.mustChangePassword) {
      setIsForceChangeOpen(true);
    }
  }, [user?.mustChangePassword]);
  
  // Track active tab only for knowing which API to hit, NOT for controlling the Tabs component!
  // Use constant default - initialize from URL in useEffect
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Initialize tab and role from URL on mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") {
      setActiveTab("register");
    }
    const roleParam = params.get("role");
    if (roleParam === "partner" || roleParam === "vendor") {
      setSelectedRole("merchant");
    }
  }, []);
  const [loading, setLoading] = useState(false);
  
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // 🛡️ SOVEREIGN AUTHORITY: URL is sole authority for authMode.
  // /auth (no params)       → customer mode ALWAYS
  // /auth?role=partner      → partner mode ALWAYS
  // localStorage is NOT read — eliminates portal context contamination.
  const [authMode] = useState<string>(() => getAuthMode());

  // Explicit role selection on registration tab (defaults to URL param, but user UI choice is authoritative)
  const [selectedRole, setSelectedRole] = useState<"customer" | "merchant">(() => {
    return getAuthMode() === "partner" ? "merchant" : "customer";
  });



  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onSubmit",
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", districtId: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
  const fetchDistricts = async () => {
    try {
      setFetching(true);
      console.log("🛰️ Fetching districts from /districts...");
      const result = await apiRequest("GET", "/districts");
      const list = Array.isArray(result?.data) ? result.data : [];

      if (list.length > 0) {
        setDistricts(list);
        console.log("✅ Districts Synced:", list);
        return;
      }

      console.error("⚠️ Backend sent unexpected format:", result);
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
      const returnUrl = getReturnUrl();
      const target =
        user?.role?.toUpperCase?.().trim?.() === "CUSTOMER" && returnUrl
          ? returnUrl
          : getClientRoleRedirectPath(user);
      console.log("🛠️ [DEBUG] Login Redirect Target:", target);
      setLocation(target);
    }
  }, [location, isAuthenticated, user, authLoading, setLocation]);

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForceChangeError(null);

    if (!forceChangeCurrent) {
      setForceChangeError("Current/Temporary password is required");
      return;
    }
    if (forceChangeNew.length < 8) {
      setForceChangeError("Password must be at least 8 characters long");
      return;
    }
    if (!/[A-Z]/.test(forceChangeNew)) {
      setForceChangeError("Password must contain at least one uppercase letter (A-Z)");
      return;
    }
    if (!/[a-z]/.test(forceChangeNew)) {
      setForceChangeError("Password must contain at least one lowercase letter (a-z)");
      return;
    }
    if (!/[0-9]/.test(forceChangeNew)) {
      setForceChangeError("Password must contain at least one number (0-9)");
      return;
    }
    if (forceChangeNew !== forceChangeConfirm) {
      setForceChangeError("New passwords do not match");
      return;
    }
    if (forceChangeCurrent === forceChangeNew) {
      setForceChangeError("New password must be different from current temporary password");
      return;
    }

    setForceChangeLoading(true);
    try {
      const res = await apiRequest("POST", "/auth/change-password", {
        currentPassword: forceChangeCurrent,
        newPassword: forceChangeNew,
        confirmPassword: forceChangeConfirm,
      });

      const updatedUser = res?.data?.user;
      if (!updatedUser) {
        throw new Error("Password change response missing user data");
      }

      toast({
        title: "पासवर्ड अपडेट हुआ / Password Updated",
        description: "Your permanent password has been set. Welcome to ShahdolBazaar!",
      });

      setIsForceChangeOpen(false);
      setUserData(updatedUser);

      const returnUrl = getReturnUrl();
      const target =
        updatedUser?.role?.toUpperCase?.().trim?.() === "CUSTOMER" && returnUrl
          ? returnUrl
          : getClientRoleRedirectPath(updatedUser);

      await new Promise((resolve) => setTimeout(resolve, 250));
      window.location.href = target;
    } catch (err: any) {
      console.error("Force change password error:", err);
      setForceChangeError(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setForceChangeLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    console.log("🔵 [AUTH] [SUBMIT] Form submitted for:", activeTab);
    
    // ✅ Client-Side Brute Force Protection
    if (loginAttempts >= 5) {
      setIsRateLimited(true);
      toast({
        title: "Rate Limited",
        description: "Too many failed attempts. Please wait 5 minutes before trying again.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    isSubmittingRef.current = true; // Guard: prevent useEffect from redirecting during submission
    
    try {
      const endpoint = `${activeTab === "login" ? "auth/login" : "auth/register"}`;
      // On registration tab, explicit user UI selection (selectedRole) is authoritative.
      // Fall back to partner portal context if not registering.
      const userRole = activeTab === "register"
        ? selectedRole
        : (authMode === "partner" || window.location.pathname.includes("partner") || document.referrer.includes("partner")
            ? "merchant"
            : "customer");

      console.log("🛡️ [AUTH ROLE RESOLVE]", {
        authMode,
        selectedRole,
        activeTab,
        resolvedRole: userRole
      });

      console.log("🚀 [REGISTER REQUEST PAYLOAD]", {
        username: data.username.trim(),
        role: userRole,
        districtId: data.districtId,
        authMode
      });

      const result = await apiRequest("POST", endpoint, {
        username: data.username.trim(),
        password: data.password,
        role: userRole,
        ...(data.districtId && { districtId: data.districtId })
      });

console.log("🔍 [AUTH] Login Result:", result);
      const userData = result?.data?.user || result?.user || result?.data;

      if (!userData) {
        throw new Error('Login failed: No user data received');
      }

      // ✅ Reset login attempts on successful login
      setLoginAttempts(0);

      // 🔒 Phase 1: Force immediate password change if flag is set
      if (userData?.mustChangePassword) {
        setForceChangeCurrent(data.password);
        setIsForceChangeOpen(true);
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // ✅ Role-based redirect with customer return destination override
      const returnUrl = getReturnUrl();
      const target =
        userData?.role?.toUpperCase?.().trim?.() === "CUSTOMER" && returnUrl
          ? returnUrl
          : getClientRoleRedirectPath(userData);
      console.log("🛠️ [DEBUG] Login Redirect Target:", target);
      
      // Wait for browser to receive cookies before redirect
      await new Promise(res => setTimeout(res, 250));
      window.location.href = target; 
      // Do NOT set loading to false here, let the browser handle the navigation
      
    } catch (error: any) {
      console.error("❌ [AUTH] Error:", error);
      
      // ✅ Increment login attempts on failed login
      if (activeTab === "login") {
        setLoginAttempts(prev => prev + 1);
      }
      
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); loginForm.reset(); registerForm.reset(); }} className="w-full">
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
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
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
                      control={loginForm.control}
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

                    <div className="flex justify-end -mt-1 mb-1">
                      <button
                        type="button"
                        onClick={() => setIsHelpOpen(true)}
                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1.5 font-medium py-1 px-1 rounded focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                        Need help logging in? / पासवर्ड सहायता
                      </button>
                    </div>
                    
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
                  {selectedRole === "merchant"
                    ? "अपना स्टोर बनाएं और बिक्री शुरू करें"
                    : "Join Shahdol Bazaar today"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
                    {/* 🛡️ ACCOUNT TYPE SELECTOR */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">
                        Account Type / खाता प्रकार
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setSelectedRole("customer")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            selectedRole === "customer"
                              ? "bg-white/20 text-white shadow-sm border border-white/20"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span>Customer / ग्राहक</span>
                          <span className="text-[10px] font-normal opacity-70">खरीदारी के लिए</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRole("merchant")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            selectedRole === "merchant"
                              ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md shadow-orange-900/30 border border-orange-500/50"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span>Merchant / दुकानदार</span>
                          <span className="text-[10px] font-normal opacity-70">दुकान / बिक्री के लिए</span>
                        </button>
                      </div>
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="districtId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select District</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:border-orange-500/50 appearance-none cursor-pointer"
                              onChange={(e) => registerForm.setValue("districtId", e.target.value)}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> कृपया प्रतीक्षा करें...</>
                      ) : selectedRole === "merchant" ? (
                        "Create Seller Account / खाता बनाएं"
                      ) : (
                        "Create Account / खाता बनाएं"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 🛡️ DIALOG 1: ADMIN-ASSISTED RECOVERY HELP DIALOG */}
        <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
          <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5 text-orange-400" />
                <DialogTitle className="text-lg font-bold">Account Access Assistance</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                खाता सहायता एवं पासवर्ड रिकवरी
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm text-slate-300 py-2">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <p className="font-semibold text-white text-xs uppercase tracking-wider text-orange-400">
                  Regional Pilot Security Notice
                </p>
                <p className="text-xs leading-relaxed text-slate-300">
                  ShahdolBazaar enforces strict identity protection for local merchants and customers. Automated SMS/OTP recovery is currently not active in this pilot phase.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-white text-sm">How to recover your account:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-300">
                  <li>Contact the <strong>ShahdolBazaar Administration & Support Desk</strong>.</li>
                  <li>Verify your store or customer identity with the authorized administrator.</li>
                  <li>The administrator will issue an audited, one-time temporary recovery password.</li>
                  <li>Log in with that temporary password. You will be required to set your new permanent password immediately upon login.</li>
                </ol>
              </div>

              <div className="p-3 bg-orange-950/30 border border-orange-500/20 rounded-xl text-xs text-orange-300">
                Support Desk: Please contact your regional district coordinator or visit the local district commerce desk for verified identity reset.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHelpOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Close / बंद करें
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 🔒 DIALOG 2: FORCED PASSWORD CHANGE DIALOG */}
        <Dialog open={isForceChangeOpen} onOpenChange={() => {}}>
          <DialogContent className="bg-slate-900 border border-orange-500/40 text-white max-w-md [&>button]:hidden">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-orange-500" />
                <DialogTitle className="text-lg font-bold">New Password Required</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                पासवर्ड बदलना अनिवार्य है
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-orange-950/40 border border-orange-500/30 rounded-xl text-xs text-orange-200 mb-2">
              You logged in using an administrator-issued temporary password. For your account security, you must choose a new permanent password before proceeding.
            </div>

            {forceChangeError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{forceChangeError}</span>
              </div>
            )}

            <form onSubmit={handleForceChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Current / Temporary Password</label>
                <Input
                  type="password"
                  value={forceChangeCurrent}
                  onChange={(e) => setForceChangeCurrent(e.target.value)}
                  placeholder="Enter current/temporary password"
                  className="bg-white/5 border-white/10 text-white text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <Input
                  type="password"
                  value={forceChangeNew}
                  onChange={(e) => setForceChangeNew(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="bg-white/5 border-white/10 text-white text-sm"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Must contain 8+ characters, uppercase, lowercase, and a number.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                <Input
                  type="password"
                  value={forceChangeConfirm}
                  onChange={(e) => setForceChangeConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="bg-white/5 border-white/10 text-white text-sm"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsForceChangeOpen(false);
                    logout(true);
                  }}
                  className="w-1/3 border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  Logout
                </Button>
                <Button
                  type="submit"
                  disabled={forceChangeLoading}
                  className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  {forceChangeLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                  ) : (
                    "Save & Continue"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

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
