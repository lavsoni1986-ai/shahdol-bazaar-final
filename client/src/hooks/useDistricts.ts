import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";

export const useDistricts = () => {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true);
        const result = await apiRequest("GET", "/districts");
        setDistricts(Array.isArray(result?.data) ? result.data : []);
      } catch (e) {
        console.error("❌ District Hook Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, []);

  return { districts, loading };
};
