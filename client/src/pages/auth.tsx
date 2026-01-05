import { useState, useEffect } from "react";
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

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        const isAdmin = userData.isAdmin === true || userData.role === "admin";
        const userRole = userData.role || "customer";
        
        // Get return URL from query params
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("return");
        
        if (returnUrl) {
          // If there's a return URL, go there
          setLocation(returnUrl);
        } else if (isAdmin || userRole === "admin") {
          // Admin goes to admin panel
          setLocation("/admin");
        } else if (userRole === "seller") {
          // Seller goes to partner dashboard
          setLocation("/partner");
        }
        // Otherwise stay on auth page
      } catch (e) {
        // Invalid user data, stay on auth page
        console.error("Error parsing user data:", e);
      }
    }
  }, [setLocation]);

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
      console.log("🟢 Success:", result);
      
      // MANUAL SESSION OVERRIDE: If username is 'admin', manually save admin session
      let finalUser = result;
      const isAdminUser = result.username === "admin" || result.role === "admin" || result.isAdmin === true;
      
      if (isAdminUser || result.username === "admin") {
        // MANUAL SESSION OVERRIDE: Explicitly set admin flags
        finalUser = {
          ...result,
          role: "admin",
          isAdmin: true,
        };
        console.log("🔵 [AUTH] Admin user detected - manually overriding session");
      }
      
      // MANUAL SESSION OVERRIDE: Double-check and force save admin session
      if (result.username === "admin") {
        const adminSession = {
          id: result.id || 1,
          username: "admin",
          role: "admin",
          isAdmin: true,
          ...result, // Include any other fields from API
        };
        localStorage.setItem("user", JSON.stringify(adminSession));
        console.log("✅ [AUTH] Manual admin session saved:", adminSession);
        finalUser = adminSession;
      } else {
        // SAVE SESSION FIRST before redirect
        localStorage.setItem("user", JSON.stringify(finalUser));
        console.log("✅ [AUTH] User session saved to localStorage:", finalUser.username, "isAdmin:", finalUser.isAdmin);
      }

      toast({
        title: activeTab === "login" ? "Welcome Back!" : "Account Created!",
        description: "Dashboard khul raha hai...",
      });

      // IMMEDIATE ADMIN REDIRECT: Check admin first, before return URL
      if (isAdminUser || finalUser.isAdmin === true || finalUser.role === "admin" || result.username === "admin") {
        console.log("🔵 [AUTH] Admin user - FORCING admin session and redirecting");
        
        // LOCAL STORAGE FORCE: Explicitly save admin session
        localStorage.setItem('user', JSON.stringify({
          username: 'admin',
          role: 'admin',
          isAdmin: true,
          id: result.id || 1,
          ...result
        }));
        
        console.log("✅ [AUTH] Admin session forced in localStorage");
        
        // Hard redirect using window.location.href
        window.location.href = '/admin';
        return; // Exit early
      }

      // Redirect based on role - check return URL first
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get("return");
      
      const userRole = finalUser.role || "customer";
      
      console.log("🔵 [AUTH] User role:", userRole, "returnUrl:", returnUrl);
      
      // If there's a return URL, use it
      if (returnUrl) {
        console.log("🔵 [AUTH] Redirecting to return URL:", returnUrl);
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 100);
      } else if (userRole === "seller") {
        console.log("🔵 [AUTH] Redirecting to /partner");
        setTimeout(() => {
          window.location.href = "/partner";
        }, 100);
      } else {
        console.log("🔵 [AUTH] Redirecting to /partner (default)");
        setTimeout(() => {
          window.location.href = "/partner";
        }, 100);
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
