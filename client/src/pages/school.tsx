import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, School, Phone, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const CLASSES = [
  "Nursery",
  "KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12"
];

export default function SchoolLandingPage() {
  const [location] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parse school slug from URL
  const schoolSlug = location.split('/school/')[1] || 'times-public-school';
  const schoolName = schoolSlug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  const [formData, setFormData] = useState({
    studentName: "",
    parentName: "",
    mobileNumber: "",
    class: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/school-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          schoolName: schoolName
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success("✅ " + data.message, {
          description: "हम जल्द ही आपसे संपर्क करेंगे।"
        });
        setFormData({ studentName: "", parentName: "", mobileNumber: "", class: "" });
      } else {
        toast.error("❌ " + data.message);
      }
    } catch (err) {
      toast.error("❌ सबमिट में त्रुटि। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen sovereign-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-3">
              <School size={32} />
              <div>
                <h1 className="text-2xl font-bold">{schoolName}</h1>
                <p className="text-purple-200 text-sm">Admission Inquiry</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* School Info Banner */}
      <div className="bg-purple-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white/20 p-3 rounded-full">
                <CheckCircle size={24} />
              </div>
              <span className="font-medium">CBSE Board</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white/20 p-3 rounded-full">
                <Phone size={24} />
              </div>
              <span className="font-medium">Admission Open</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white/20 p-3 rounded-full">
                <MapPin size={24} />
              </div>
              <span className="font-medium">Shahdol, MP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* School Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="text-xl">About {schoolName}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                {schoolName} is a premier educational institution dedicated to providing 
                quality education to students. Our mission is to nurture young minds 
                and prepare them for a successful future.
              </p>
              
              <div className="space-y-3 pt-4">
                <h3 className="font-semibold text-slate-800">Key Features:</h3>
                <ul className="space-y-2">
                  {[
                    "Experienced & Qualified Faculty",
                    "Modern Infrastructure & Labs",
                    "Smart Classrooms",
                    "Sports & Extra-curricular Activities",
                    "Safe & Secure Campus",
                    "Transportation Available"
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle size={16} className="text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg mt-6">
                <h4 className="font-semibold text-purple-800 mb-2">Classes Offered</h4>
                <div className="flex flex-wrap gap-2">
                  {CLASSES.map((cls) => (
                    <span key={cls} className="px-3 py-1 bg-white border border-purple-200 rounded-full text-sm text-purple-700">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admission Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="text-xl">Admission Inquiry Form</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    छात्र का नाम *
                  </label>
                  <Input
                    placeholder="Enter student name"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    अभिभावक का नाम *
                  </label>
                  <Input
                    placeholder="Enter parent name"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    मोबाइल नंबर *
                  </label>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    क्लास *
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Class</option>
                    {CLASSES.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg font-semibold mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Inquiry"
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center mt-4">
                  आपकी जानकारी पूर्णतः गोपनीय रहेगी। हम आपसे संपर्क नहीं करेंगे।
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-100 py-8 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-600">
            Need help? Call us at <strong>+91 74891 77624</strong>
          </p>
          <p className="text-slate-500 text-sm mt-2">
            © 2024 {schoolName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
