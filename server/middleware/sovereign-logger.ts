import { prisma } from "../storage";

export const sovereignLogger = async (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", async () => {
    // 🛡️ BHARAT-OS: Intelligence Gathering
    await prisma.eventLog.create({
      data: {
        type: `${req.method}_${req.path}`,
        districtId: req.user?.districtId || 1, // शहडोल डिफ़ॉल्ट
        metadata: {
          duration: Date.now() - start,
          status: res.statusCode,
          intent: req.body?.intent || "browse"
        }
      }
    });
  });
  next();
};
