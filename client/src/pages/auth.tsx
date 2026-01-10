import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
import { Store, Loader2 } from "lucide-react";

// ✅ Schema Validation Rules
const authSchema = z.object({
  username: z.string().min(3, "Username kam se kam 3 akshar ka hona chahiye"),
  password: z.string().min(6, "Password kam se kam 6 akshar ka hona chahiye"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  // Use ref to prevent infinite redirect loops
  const hasCheckedAuth = useRef(false);
  const hasRedirected = useRef(false);

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    // Prevent multiple redirect checks
    if (hasCheckedAuth.current || hasRedirected.current) {
      return;
    }

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        // Check for admin (handle both legacy "admin" and new "SUPER_ADMIN" role)
        const isAdmin = userData.isAdmin === true || 
                       userData.role === "admin" || 
                       userData.role === "SUPER_ADMIN" ||
                       userData.username === "admin";
        const userRole = userData.role || "customer";
        
        // Get return URL from query params
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("return");
        
        // Prevent redirect loop - don't redirect if already on the target page
        const currentPath = window.location.pathname;
        
        if (returnUrl && returnUrl !== currentPath && returnUrl !== "/auth") {
          hasRedirected.current = true;
          setLocation(returnUrl);
        } else if ((isAdmin || userRole === "admin" || userRole === "SUPER_ADMIN") && currentPath !== "/admin") {
          hasRedirected.current = true;
          setLocation("/admin");
        } else if (userRole === "seller" && !currentPath.startsWith("/partner")) {
          hasRedirected.current = true;
          setLocation("/partner");
        }
        // Otherwise stay on auth page
      } catch (e) {
        // Invalid user data, stay on auth page
        console.error("Error parsing user data:", e);
      }
    }
    
    hasCheckedAuth.current = true;
  }, []); // Empty dependency array - only run once on mount

  // ✅ Agar sab sahi hai to ye chalega
  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    console.log("🔵 Button Clicked! Data:", data); // Debugging
    setLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const url = `${API_BASE || ""}/api/${activeTab === "login" ? "login" : "register"}`;
      console.log("🔵 Calling API:", url); // Debugging

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "customer" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
      }

      // Success
      console.log("🟢 [AUTH] Login API Response:", JSON.stringify(result, null, 2));
      
      // Handle JWT login response format: { accessToken, user: {...} }
      // Or legacy format: { id, username, role, ... }
      const userData = result.user || result; // Support both formats
      const accessToken = result.accessToken || null;
      
      // DEBUG: Log user data from API
      console.log("🔵 [AUTH] User data from API:", {
        username: userData.username,
        role: userData.role,
        isAdmin: userData.isAdmin,
        fullUserData: userData
      });
      
      // CLEAR LOCALSTORAGE FIRST to avoid old role conflicts
      console.log("🧹 [AUTH] Clearing localStorage to remove old session data");
      localStorage.clear();
      console.log("✅ [AUTH] localStorage cleared");
      
      // Store accessToken if present (JWT format)
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        console.log("✅ [AUTH] Access token stored in localStorage");
      }
      
      // Check if admin user (handle both legacy "admin" role and new "SUPER_ADMIN" role)
      const isAdminUser = 
        userData.username === "admin" || 
        userData.role === "admin" || 
        userData.role === "SUPER_ADMIN" ||
        userData.isAdmin === true;
      
      console.log("🔵 [AUTH] Admin check result:", {
        username: userData.username,
        role: userData.role,
        isAdmin: userData.isAdmin,
        isAdminUser: isAdminUser
      });
      
      // Prepare final user object
      let finalUser = {
        ...userData,
        // Normalize role for backward compatibility
        role: isAdminUser ? "admin" : (userData.role === "MERCHANT" ? "seller" : userData.role),
        isAdmin: isAdminUser,
      };
      
      // If username is 'admin', explicitly set admin flags
      if (userData.username === "admin") {
        finalUser = {
          ...finalUser,
          username: "admin",
          role: "admin",
          isAdmin: true,
        };
        console.log("🔵 [AUTH] Admin user detected - setting admin flags");
      }
      
      // STORAGE SYNC: Save user to localStorage IMMEDIATELY (after clearing old data)
      // For admin users, ensure username is explicitly set to 'admin'
      const userToStore = userData.username === "admin" || isAdminUser
        ? {
            ...finalUser,
            ...userData,
            username: "admin",
            role: "admin",
            isAdmin: true,
          }
        : finalUser;
      
      localStorage.setItem("user", JSON.stringify(userToStore));
      
      // Verify it was saved
      const verifySaved = localStorage.getItem("user");
      console.log("✅ [AUTH] User session saved to localStorage:", verifySaved);
      console.log("✅ [AUTH] Parsed saved user:", JSON.parse(verifySaved || "{}"));

      // IMMEDIATE ADMIN REDIRECT: Check admin first, before return URL
      // Handle both "admin" and "SUPER_ADMIN" roles
      const shouldRedirectToAdmin = 
        isAdminUser || 
        finalUser.isAdmin === true || 
        finalUser.role === "admin" || 
        finalUser.role === "SUPER_ADMIN" ||
        userData.role === "SUPER_ADMIN" ||
        userData.username === "admin";
      
      console.log("🔵 [AUTH] Admin redirect check:", {
        isAdminUser,
        finalUserRole: finalUser.role,
        finalUserIsAdmin: finalUser.isAdmin,
        userDataRole: userData.role,
        userDataUsername: userData.username,
        shouldRedirectToAdmin
      });
      
      if (shouldRedirectToAdmin) {
        console.log("🔵 [AUTH] ✅ ADMIN USER DETECTED - FORCING HARD REDIRECT TO /admin");
        
        // Ensure admin session is saved correctly
        const adminSession = {
          ...userData,
          username: "admin",
          role: "admin",
          isAdmin: true,
        };
        localStorage.setItem('user', JSON.stringify(adminSession));
        
        // Verify localStorage was set correctly
        const savedAdmin = localStorage.getItem('user');
        console.log("✅ [AUTH] Admin session verified in localStorage:", savedAdmin);
        
        // Show toast briefly before redirect
        toast({
          title: "Admin Login Successful!",
          description: "Redirecting to admin dashboard...",
        });
        
        // HARD REFRESH: Use window.location.href for immediate hard redirect
        // This ensures full page reload and clears any stale React state
        console.log("🔄 [AUTH] Performing IMMEDIATE HARD REDIRECT to /admin");
        window.location.href = '/admin';
        return; // Exit early - don't continue with other redirects
      }

      toast({
        title: activeTab === "login" ? "Welcome Back!" : "Account Created!",
        description: "Dashboard khul raha hai...",
      });

      // Set redirect flag to prevent useEffect from running again
      hasRedirected.current = true;

      // Redirect based on role - check return URL first
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get("return");
      
      const userRole = finalUser.role || "customer";
      
      console.log("🔵 [AUTH] User role:", userRole, "returnUrl:", returnUrl);
      
      // Determine redirect URL
      let redirectUrl = "/partner"; // default
      
      if (returnUrl && returnUrl !== "/auth" && returnUrl !== window.location.pathname) {
        redirectUrl = returnUrl;
      } else if (userRole === "seller" || userRole === "MERCHANT") {
        redirectUrl = "/partner";
      }
      
      // Prevent redirect loops - don't redirect to the same page
      if (redirectUrl !== window.location.pathname) {
        console.log("🔵 [AUTH] Redirecting to:", redirectUrl);
        // Use window.location.href for hard redirect (prevents React re-renders)
        window.location.href = redirectUrl;
      }
    } catch (error: any) {
      console.error("🔴 Error:", error);
      toast({
        variant: "destructive",
        title: "Gadbad ho gayi",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Agar Validation Fail hui to ye chalega (NEW)
  const onError = (errors: any) => {
    console.log("🟡 Validation Errors:", errors);
    toast({
      variant: "destructive",
      title: "Form Adhoora Hai!",
      description: "Kripya Username (3+) aur Password (6+) sahi bharein.",
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-orange-500 text-white text-center pb-8">
          <div className="mx-auto bg-white/20 p-3 rounded-2xl w-fit mb-4">
            <Store size={32} />
          </div>
          <CardTitle className="text-2xl font-black italic uppercase">
            Partner Portal
          </CardTitle>
          <CardDescription className="text-orange-100 font-bold">
            Apni dukan manage karein
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-bold">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-bold">
                Register
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              {/* ✅ Error Handler Added here */}
              <form
                onSubmit={form.handleSubmit(onSubmit, onError)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="shopname"
                          {...field}
                          className="rounded-xl h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-bold text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="******"
                          {...field}
                          className="rounded-xl h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-bold text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-6 rounded-xl shadow-lg uppercase tracking-widest transition-all active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : activeTab === "login" ? (
                    "Login Now"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
