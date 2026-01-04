import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import {
  Store,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Phone,
} from "lucide-react";
import { Link } from "wouter";

// Shahdol Local Areas
const shahdolAreas = [
  "Shahdol City",
  "Burhar",
  "Jaitpur",
  "Sohagpur",
  "Beohari",
  "Jaisinghnagar",
  "Kotma",
  "Anuppur",
  "Amarkantak",
  "Pali",
  "Manpur",
  "Other",
];

// Shop Categories
const shopCategories = [
  "Kirana Store",
  "Mobile & Electronics",
  "Cloth House",
  "MEDICAL",
  "Restaurant & Cafe",
  "Saloons & Parlour",
  "Hardware & Paints",
  "Other",
];

const shopFormSchema = z.object({
  name: z.string().min(2, "Shop name kam se kam 2 characters ka ho"),
  category: z.string().min(1, "Category chunnana zaroori hai"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone number 10 digits ka hona chahiye"),
  address: z.string().min(1, "Address chunnana zaroori hai"),
  description: z
    .string()
    .min(10, "Dukan ke baare mein kam se kam 10 shabd likhein"),
  image: z.union([
    z.string().url("Sahi Photo Link (URL) dalein"),
    z.literal(""),
  ]).optional(),
});

export default function SellerOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user) {
      setLocation("/auth?return=/seller-onboarding");
      return;
    }
    // If user is already a seller, redirect to dashboard
    if (user.role === "seller" || user.role === "admin") {
      setLocation("/partner");
    }
  }, [user, setLocation]);

  // Temporarily disable strict validation for debugging
  const form = useForm<z.infer<typeof shopFormSchema>>({
    // resolver: zodResolver(shopFormSchema), // TEMPORARILY DISABLED
    defaultValues: {
      name: "",
      category: "",
      phone: "",
      address: "",
      description: "",
      image: "",
    },
  });

  // Direct submit function that bypasses all validation
  const handleDirectSubmit = async (formData: any) => {
    try {
      console.log('Direct submit called with:', formData);
      
      const authHeaders = {
        "Content-Type": "application/json",
        "x-user-id": user?.id?.toString() || "",
      };

      const payload = {
        name: formData.name || '',
        category: formData.category || '',
        phone: formData.phone || '',
        mobile: formData.phone || formData.mobile || '',
        address: formData.address || '',
        description: formData.description || '',
        ownerId: user.id,
        image: formData.image && formData.image.trim() !== "" ? formData.image : undefined,
      };

      console.log('Sending payload:', payload);

      const res = await fetch("https://shahdol-bazaar-v2.onrender.com/api/seller/apply", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log('API Response:', result);

      if (res.ok) {
        setIsSubmitted(true);
        toast({
          title: "Application Submitted! ✅",
          description: "Aapka shop successfully create ho gaya hai.",
        });
        // Return result so mutation onSuccess can handle it
        return result;
      } else {
        throw new Error(result.message || "Application failed");
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Application submit nahi ho payi.",
      });
      // Force redirect anyway as last resort
      setTimeout(() => {
        window.location.href = '/partner';
      }, 3000);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shopFormSchema>) => {
      const result = await handleDirectSubmit(data);
      return result;
    },
    onSuccess: (data: any) => {
      // Update user role in localStorage if returned from API
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else if (user) {
        // Fallback: update locally
        const updatedUser = { ...user, role: "seller" };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      
      setIsSubmitted(true);
      toast({
        title: "Application Submitted! ✅",
        description:
          "Aapka shop successfully create ho gaya hai. Ab aap seller dashboard par jaa sakte hain.",
      });
      // Redirect to partner dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/partner'; // Use window.location to force reload
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Application submit nahi ho payi.",
      });
    },
  });

  if (!user) {
    return null; // Will redirect
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-green-500 text-white text-center pb-8">
            <div className="mx-auto bg-white/20 p-4 rounded-full w-fit mb-4">
              <CheckCircle2 size={48} />
            </div>
            <CardTitle className="text-2xl font-black">
              Application Submitted!
            </CardTitle>
            <CardDescription className="text-green-100 font-medium">
              Aapka shop ab active hai!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-slate-600">
              Aapka shop successfully create ho gaya hai! Ab aap seller dashboard par jaa sakte hain.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft size={18} className="mr-2" /> Home
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={() => setLocation("/partner")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft size={18} className="mr-2" /> Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Apply to Become a Seller
          </h1>
          <p className="text-slate-600">
            Apni dukan ka application submit karein. Admin verification ke baad
            aap seller ban jayenge.
          </p>
        </div>

        <Card className="shadow-xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-orange-500 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Store size={32} />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">
                  Shop Details
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Apni dukan ki jankari dalein
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Form Submitted'); // DEBUG: Manual log
                  console.log('Form onSubmit triggered', form.getValues());
                  
                  const formData = form.getValues();
                  
                  // Manual validation check
                  if (!formData.name || formData.name.length < 2) {
                    alert('Shop name must be at least 2 characters');
                    return;
                  }
                  if (!formData.category) {
                    alert('Please select a category');
                    return;
                  }
                  if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
                    alert('Phone number must be 10 digits');
                    return;
                  }
                  if (!formData.address) {
                    alert('Please select an address');
                    return;
                  }
                  if (!formData.description || formData.description.length < 10) {
                    alert('Description must be at least 10 characters');
                    return;
                  }
                  
                  // Call mutation
                  submitMutation.mutate(formData);
                }}
                className="space-y-6"
              >
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">
                        Shop Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Sharma Kirana Store"
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">
                        Shop Category *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 bg-white">
                            <SelectValue placeholder="Category chunein" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border shadow-xl z-[100]">
                          {shopCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700 flex items-center gap-2">
                          <Phone size={16} /> Phone Number *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="9876543210"
                            maxLength={10}
                            className="h-12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="address"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700 flex items-center gap-2">
                          <MapPin size={16} /> Area/Location *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 bg-white">
                              <SelectValue placeholder="Area chunein" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white border shadow-xl z-[100]">
                            {shahdolAreas.map((area) => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  name="image"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">
                        Shop Photo (Dukan ki Photo)
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || ""}
                          onChange={(url) => {
                            console.log("Onboarding Image Updated:", url);
                            field.onChange(url);
                          }}
                          onRemove={() => field.onChange("")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">
                        Shop Description *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Apni dukan ke baare mein likhein..."
                          rows={4}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-orange-600 h-14 text-lg font-bold shadow-lg hover:bg-orange-700"
                  disabled={submitMutation.isPending}
                  onClick={() => {
                    // Debug log - don't prevent default
                    console.log('Button clicked - form should submit');
                    alert('Button Clicked - Checking form...');
                    
                    // Log form state
                    const formData = form.getValues();
                    const formErrors = form.formState.errors;
                    console.log('Form values:', formData);
                    console.log('Form errors:', formErrors);
                    console.log('Form is valid:', form.formState.isValid);
                  }}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" /> Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
                
                {/* Backup button that bypasses form entirely */}
                <Button
                  type="button"
                  className="w-full mt-4 bg-blue-600 h-12 text-base font-bold shadow-lg hover:bg-blue-700"
                  onClick={async () => {
                    alert('Backup Button Clicked - Bypassing form validation');
                    const formData = form.getValues();
                    console.log('Backup submit with data:', formData);
                    await handleDirectSubmit(formData);
                  }}
                >
                  Submit (Direct - No Validation)
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

