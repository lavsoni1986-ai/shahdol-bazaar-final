import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Thermometer, ChefHat } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

interface DistrictConfig {
  id: number;
  name: string;
  slug: string;
  state: string;
  primaryLanguage: string;
  dialects: string[];
  festivals: Array<{
    name: string;
    month: number;
    date: number;
    significance: string;
  }>;
  localCuisine: string[];
  weatherPatterns: any;
  businessHours: any;
  emergencyNumbers: Record<string, string>;
  aiPersonality: {
    greeting: string;
    tone: 'formal' | 'casual' | 'regional';
    commonPhrases: string[];
  };
}

export default function DistrictManager() {
  const [districts, setDistricts] = useState<DistrictConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDistrict, setNewDistrict] = useState({
    name: '',
    slug: '',
    state: 'Madhya Pradesh'
  });

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await apiRequest("GET", "/district/configs");
      const configs = response?.data?.districts ?? response?.data ?? [];
      setDistricts(Array.isArray(configs) ? configs : []);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDistrict = async () => {
    if (!newDistrict.name || !newDistrict.slug) return;

    try {
      const response = await apiRequest("POST", "/district/add", newDistrict);

      if (response?.success) {
        setNewDistrict({ name: '', slug: '', state: 'Madhya Pradesh' });
        fetchDistricts();
      }
    } catch (error) {
      console.error('Failed to add district:', error);
    }
  };

  if (loading) return <div className="p-6">Loading districts...</div>;

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🌍 Sovereign Multi-District Grid</h1>
        <Button onClick={fetchDistricts} variant="outline">
          Refresh Grid
        </Button>
      </div>

      {/* Add New District */}
      <Card>
        <CardHeader>
          <CardTitle>Add New District</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="District Name (e.g., Anuppur)"
              value={newDistrict.name}
              onChange={(e) => setNewDistrict(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Slug (e.g., anuppur)"
              value={newDistrict.slug}
              onChange={(e) => setNewDistrict(prev => ({ ...prev, slug: e.target.value }))}
            />
            <Input
              placeholder="State"
              value={newDistrict.state}
              onChange={(e) => setNewDistrict(prev => ({ ...prev, state: e.target.value }))}
            />
          </div>
          <Button onClick={addDistrict} className="mt-4">
            Add District to Grid
          </Button>
        </CardContent>
      </Card>

      {/* District Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {districts.map((district) => (
          <Card key={district.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {district.name}, {district.state}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language & Culture */}
              <div>
                <h4 className="font-semibold text-sm mb-2">🗣️ Local Identity</h4>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{district.primaryLanguage}</Badge>
                  {district.dialects.map(dialect => (
                    <Badge key={dialect} variant="outline">{dialect}</Badge>
                  ))}
                </div>
              </div>

              {/* AI Personality */}
              <div>
                <h4 className="font-semibold text-sm mb-2">🤖 AI Personality</h4>
                <p className="text-sm text-gray-600">{district.aiPersonality.greeting}</p>
                <Badge variant="secondary" className="mt-1">
                  {district.aiPersonality.tone}
                </Badge>
              </div>

              {/* Festivals */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Local Festivals
                </h4>
                <div className="flex flex-wrap gap-1">
                  {district.festivals.slice(0, 3).map(festival => (
                    <Badge key={festival.name} variant="outline" className="text-xs">
                      {festival.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Cuisine */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <ChefHat className="w-4 h-4" />
                  Local Cuisine
                </h4>
                <div className="flex flex-wrap gap-1">
                  {district.localCuisine.slice(0, 4).map(food => (
                    <Badge key={food} variant="secondary" className="text-xs">
                      {food}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Weather Info */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Thermometer className="w-4 h-4" />
                  Weather Patterns
                </h4>
                <div className="text-xs text-gray-600">
                  Hot: {district.weatherPatterns.hot.avgTemp}°C
                  Rainy: {district.weatherPatterns.rainy.avgTemp}°C
                  Winter: {district.weatherPatterns.winter.avgTemp}°C
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h4 className="font-semibold text-sm mb-2">🕒 Business Hours</h4>
                <p className="text-xs text-gray-600">
                  Standard: {district.businessHours.standard.open} - {district.businessHours.standard.close}
                </p>
                <p className="text-xs text-gray-600">
                  Festivals: {district.businessHours.festivals.open} - {district.businessHours.festivals.close}
                </p>
              </div>

              {/* Emergency Numbers */}
              <div>
                <h4 className="font-semibold text-sm mb-2">🚨 Emergency</h4>
                <div className="text-xs space-y-1">
                  <p>Police: {district.emergencyNumbers.police}</p>
                  <p>Fire: {district.emergencyNumbers.fire}</p>
                  <p>Ambulance: {district.emergencyNumbers.ambulance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {districts.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No Districts in Grid</h3>
          <p className="text-gray-500">Add your first district to start the Sovereign expansion.</p>
        </div>
      )}
    </div>
  );
}
