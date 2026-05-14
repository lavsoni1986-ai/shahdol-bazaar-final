import { createEventLog } from "../repositories/eventLog.repo";

export const sovereignLogger = async (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - start;

    // 🛡️ BHARAT-OS: Logging every interaction for AI Training
    await createEventLog({
      type: req.method + "_" + req.path,
      userId: req.ctx?.userId || null,
      districtId: req.user?.districtId || req.districtId,
      metadata: {
        ip: req.ip,
        duration: duration,
        status: res.statusCode,
        agent: req.get("user-agent")
      }
    });
  });
  next();
};
