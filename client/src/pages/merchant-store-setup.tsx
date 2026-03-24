import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, MapPin, Phone, Package, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function MerchantStoreSetup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    mobile: "",
    districtId: "",
  });

  // Check if user has existing shop/vendor
  const { data: existingShop } = useQuery({
    queryKey: ["merchant-shop"],
    queryFn: async () => {
      // Auth handled by cookies - API will return 401 if not authenticated
      // Try vendor API first
      const vendorRes = await fetch("/api/vendors/mine", {
        credentials: "include",
      });
      if (vendorRes.ok) {
        return await vendorRes.json();
      }
      // Fallback to shops API
      const res = await fetch("/api/shops/mine", {
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch shop");
      return res.json();
    },
  });

  // Fetch districts
  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/districts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.categories || []);
    },
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Auth handled by cookies - no manual token needed
      const res = await fetch("/api/partner/shop/create-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          description: data.description,
          address: data.address,
          phone: data.phone,
          mobile: data.mobile,
          districtId: data.districtId ? Number(data.districtId) : null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create shop");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Store created successfully!");
      setTimeout(() => {
        setLocation("/merchant/dashboard");
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create store");
    },
  });

  useEffect(() => {
    if (existingShop) {
      toast.info("You already have a store setup");
      setTimeout(() => {
        setLocation("/merchant/dashboard");
      }, 1000);
    }
  }, [existingShop, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.category) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
    } else {
      if (!formData.address || !formData.phone) {
        toast.error("Please fill in all required fields");
        return;
      }
      createShopMutation.mutate(formData);
    }
  };

  if (existingShop) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Store className="h-6 w-6" />
              Store Setup
            </CardTitle>
            <CardDescription>
              {step === 1 ? "Step 1: Basic Information" : "Step 2: Contact & Location"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Your store name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat: any) => (
                          <div key={cat.id || cat.name}>
                            <SelectItem value={cat.name} className="font-bold pl-0">
                              {cat.name} (Main)
                            </SelectItem>
                            {cat.subcategories && cat.subcategories.length > 0 &&
                              cat.subcategories.map((subCat: any) => (
                                <SelectItem key={subCat.id} value={subCat.name} className="pl-8">
                                  └─ {subCat.name}
                                </SelectItem>
                              ))
                            }
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                      placeholder="Describe your store..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District (Optional)
                    </label>
                    <Select value={formData.districtId} onValueChange={(value) => setFormData({ ...formData, districtId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts?.map((district: any) => (
                          <SelectItem key={district.id} value={String(district.id)}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    Next: Contact Information <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder="Store address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        type="tel"
                        placeholder="10-digit phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile (Alternative)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        type="tel"
                        placeholder="Alternative mobile number"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      disabled={createShopMutation.isPending}
                    >
                      {createShopMutation.isPending ? "Creating..." : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Store
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
