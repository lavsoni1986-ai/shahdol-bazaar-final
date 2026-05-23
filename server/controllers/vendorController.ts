import type { Request, Response } from "express";
import { findVendorBySlug } from "../repositories/vendor.repo";
import { mapVendorByType } from "../dto/entity.dto";

// Vendor ka poora data fetch karne ke liye (SaaS Dashboard Logic)
export const getVendorDashboard = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const districtId = req.districtId ?? undefined;
    const vendorData = await findVendorBySlug(slug, districtId);

    if (!vendorData) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found in ShahdolBazaar"
      });
    }

    // Duniya ka best SaaS experience: Data ke sath safety signals bhi bhejna
    res.json({
      success: true,
      data: await mapVendorByType(vendorData),
      trustSignal: vendorData.isVerified ? "DSSL Verified" : "Pending Verification"
    });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ success: false, error: "Database Connection Error" });
  }
};
