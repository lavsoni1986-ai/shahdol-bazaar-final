import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Vendor ka poora data fetch karne ke liye (SaaS Dashboard Logic)
export const getVendorDashboard = async (req: any, res: any) => {
  const { slug } = req.params; 

  try {
    const vendorData = await prisma.vendor.findFirst({
      where: {
        slug: slug,
        ...(req.districtId ? { districtId: req.districtId } : {}),
      },
      include: {
        products: true, // Hospital services ya Shop products
        offers: true,   // Latest deals
      }
    });

    if (!vendorData) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor profile not found in ShahdolBazaar" 
      });
    }

    // Duniya ka best SaaS experience: Data ke sath safety signals bhi bhejna
    res.json({
      success: true,
      data: vendorData,
      trustSignal: vendorData.isVerified ? "DSSL Verified" : "Pending Verification"
    });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ success: false, error: "Database Connection Error" });
  }
}
