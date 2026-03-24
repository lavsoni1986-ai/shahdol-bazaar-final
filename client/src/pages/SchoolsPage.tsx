import { useState } from "react";
import { Link } from "wouter";
import { School, MapPin, Phone, ArrowRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Mock data for schools in Shahdol - In production, this would come from an API
const SCHOOLS_DATA = [
  {
    id: 1,
    slug: "times-public-school",
    name: "Times Public School",
    board: "CBSE",
    category: "Co-Educational",
    classes: "Nursery to Class 12",
    address: "Station Road, Shahdol",
    phone: "+91 74891 77624",
    rating: 4.5,
    reviews: 128,
    features: ["Smart Classrooms", "Sports Ground", "Transport", "Library"],
    image: null
  },
  {
    id: 2,
    slug: "st-marys-higher-secondary",
    name: "St. Mary's Higher Secondary School",
    board: "CBSE",
    category: "Co-Educational",
    classes: "Class 1 to Class 12",
    address: "Civil Lines, Shahdol",
    phone: "+91 75812 34567",
    rating: 4.3,
    reviews: 95,
    features: ["Science Lab", "Computer Lab", "Sports", "Hostel"],
    image: null
  },
  {
    id: 3,
    slug: "government-higher-secondary",
    name: "Government Higher Secondary School",
    board: "MP Board",
    category: "Co-Educational",
    classes: "Class 1 to Class 12",
    address: "Bus Stand, Shahdol",
    phone: "+91 75812 23456",
    rating: 3.9,
    reviews: 156,
    features: ["Government Aided", "Science Stream", "Commerce Stream"],
    image: null
  },
  {
    id: 4,
    slug: "ashoka-public-school",
    name: "Ashoka Public School",
    board: "CBSE",
    category: "Co-Educational",
    classes: "Nursery to Class 10",
    address: "Anuppur Road, Shahdol",
    phone: "+91 74891 88776",
    rating: 4.2,
    reviews: 78,
    features: ["Smart Classes", "Sports Complex", "Music & Dance", "Transport"],
    image: null
  },
  {
    id: 5,
    slug: "jawahar-navodaya-vidyalaya",
    name: "Jawahar Navodaya Vidyalaya",
    board: "CBSE",
    category: "Residential",
    classes: "Class 6 to Class 12",
    address: "Shahdol-Bharatpur Road, Shahdol",
    phone: "+91 75812 45678",
    rating: 4.6,
    reviews: 210,
    features: ["JNV Campus", "Hostel", "Sports", "Science Labs"],
    image: null
  },
  {
    id: 6,
    slug: "delhi-public-school-shahdol",
    name: "Delhi Public School Shahdol",
    board: "CBSE",
    category: "Co-Educational",
    classes: "Nursery to Class 12",
    address: "Ring Road, Shahdol",
    phone: "+91 74891 99887",
    rating: 4.4,
    reviews: 145,
    features: ["Modern Infrastructure", "Swimming Pool", "Sports Ground", "Transport"],
    image: null
  }
];

export default function SchoolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [boardFilter, setBoardFilter] = useState("all");

  const filteredSchools = SCHOOLS_DATA.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          school.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBoard = boardFilter === "all" || school.board === boardFilter;
    return matchesSearch && matchesBoard;
  });

  return (
    <div className="min-h-screen sovereign-bg">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-600 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <School className="w-8 h-8" />
            </div>
            <span className="text-purple-200 font-medium">Education Directory</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight">
            Top Schools in <span className="text-orange-400">Shahdol</span>
          </h1>
          
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mb-8">
            Find the best schools for your children in Shahdol. Browse CBSE, MP Board, and ICSE affiliated institutions.
          </p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search schools by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 bg-white text-slate-900 border-0 text-lg h-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setBoardFilter("all")}
                className={`px-6 py-4 font-semibold ${boardFilter === "all" ? "bg-orange-500" : "bg-white/10 hover:bg-white/20"}`}
              >
                All
              </Button>
              <Button 
                onClick={() => setBoardFilter("CBSE")}
                className={`px-6 py-4 font-semibold ${boardFilter === "CBSE" ? "bg-orange-500" : "bg-white/10 hover:bg-white/20"}`}
              >
                CBSE
              </Button>
              <Button 
                onClick={() => setBoardFilter("MP Board")}
                className={`px-6 py-4 font-semibold ${boardFilter === "MP Board" ? "bg-orange-500" : "bg-white/10 hover:bg-white/20"}`}
              >
                MP Board
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Schools Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">
            {filteredSchools.length} {filteredSchools.length === 1 ? "School" : "Schools"} Found
          </h2>
        </div>

        {filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <School className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No schools found matching your criteria</p>
            <Button 
              onClick={() => {setSearchQuery(""); setBoardFilter("all");}}
              className="mt-4 bg-orange-600 hover:bg-orange-700"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <Link key={school.id} href={`/school/${school.slug}`}>
                <Card className="bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer h-full group">
                  {/* School Image Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-orange-600/20 rounded-t-lg overflow-hidden">
                    {school.image ? (
                      <img src={school.image} alt={school.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <School className="w-16 h-16 text-slate-600 group-hover:text-orange-500 transition-colors" />
                      </div>
                    )}
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg text-white group-hover:text-orange-400 transition-colors">
                          {school.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                          {school.board} • {school.category}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                        <span className="text-orange-400 font-bold">★</span>
                        <span className="text-orange-400 font-semibold">{school.rating}</span>
                        <span className="text-slate-500 text-sm">({school.reviews})</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2 text-slate-400 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{school.address}</span>
                    </div>
                    
                    <div className="flex items-start gap-2 text-slate-400 text-sm">
                      <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{school.phone}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {school.features.slice(0, 3).map((feature, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                      {school.features.length > 3 && (
                        <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">
                          +{school.features.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-sm">{school.classes}</span>
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View Details <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 border-t border-slate-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Is your school listed here?
          </h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Get your institution listed on Shahdol Bazaar and reach thousands of parents looking for quality education.
          </p>
          <Link href="/merchant/onboarding">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg font-semibold">
              Register Your School
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
