// VendorRegister - Vendor onboarding with district linking
// Simplified registration for vendors to join the platform

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { User, ArrowLeft, Building2, Store, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useDistrict } from "@/contexts/DistrictContext";
import { useDistricts } from "@/hooks/useDistricts";
import { apiRequest } from "@/lib/api-client";

export default function VendorRegister() {
  const [, setLocation] = useLocation();
  const { currentDistrict } = useDistrict();
  const { districts, loading: loadingDistricts } = useDistricts();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Account
    username: "",
    password: "",
    confirmPassword: "",
    // Step 2: Business
    businessName: "",
    businessType: "retail",
    phone: "",
    email: "",
    // Step 3: Location
    districtId: currentDistrict?.id?.toString() || "",
    address: "",
    city: "",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "auth/register", {
        username: data.username,
        password: data.password,
        role: "merchant",
        phone: data.phone,
        email: data.email,
        shopName: data.businessName,
        shopAddress: data.address,
        districtId: data.districtId ? parseInt(data.districtId) : null,
      });
    },
    onSuccess: async () => {
      toast.success("Account created! Please login.");
      setLocation("/auth?role=partner");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    registerMutation.mutate(formData);
  };

  const businessTypes = [
    { value: "retail", label: "Retail Shop", icon: "🏪" },
    { value: "service", label: "Service Provider", icon: "🔧" },
    { value: "healthcare", label: "Hospital/Clinic", icon: "🏥" },
    { value: "education", label: "School/Coaching", icon: "🎓" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Partner Registration</CardTitle>
            <CardDescription className="text-slate-400">
              Join the BharatOS ecosystem in {currentDistrict?.name || "your district"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Progress Steps */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s}
                  className={`w-3 h-3 rounded-full transition-all ${
                    step >= s ? "bg-orange-500" : "bg-slate-600"
                  }`}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Account Details
                  </h3>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Username</label>
                    <Input
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Password</label>
                    <Input
                      type="password"
                      placeholder="Create password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Confirm Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={() => formData.username && formData.password && setStep(2)}
                    disabled={!formData.username || !formData.password}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-orange-500" />
                    Business Details
                  </h3>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Business Name</label>
                    <Input
                      placeholder="Your shop or business name"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Business Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {businessTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, businessType: type.value })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            formData.businessType === type.value
                              ? "border-orange-500 bg-orange-500/10 text-white"
                              : "border-slate-600 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          <span className="text-lg mr-2">{type.icon}</span>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Phone Number</label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Email (Optional)</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 border-slate-600 text-slate-300"
                    >
                      Back
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => formData.businessName && formData.phone && setStep(3)}
                      disabled={!formData.businessName || !formData.phone}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Location
                  </h3>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Select District</label>
                    <select 
                      value={formData.districtId}
                      onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                      className="w-full bg-slate-700 border-slate-600 text-white rounded-lg p-3 appearance-none"
                    >
                      <option value="">-- चुनें अपना जिला (Select District) --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id.toString()}>{d.name}</option>
                      ))}
                    </select>
                    {loadingDistricts && <p className="text-[10px] text-orange-500 animate-pulse">Loading districts...</p>}
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Full Address</label>
                    <Input
                      placeholder="Full address with landmark"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">City/Town</label>
                    <Input
                      placeholder="City or town name"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 border-slate-600 text-slate-300"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit"
                      disabled={registerMutation.isPending || !formData.districtId}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      {registerMutation.isPending ? "Creating..." : "Complete Registration"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
Already have an account?{" "}
               <Link href="/auth?role=partner" className="text-orange-500 hover:underline">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}