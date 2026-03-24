import { useState, useEffect } from "react";

export const useDistricts = () => {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/districts');
        const result = await res.json();
        if (result.success) setDistricts(result.data || []);
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