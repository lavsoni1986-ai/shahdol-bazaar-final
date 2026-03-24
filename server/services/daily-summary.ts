import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { Groq } from 'groq-sdk';
import Twilio from 'twilio';

// ============================================
// SECURITY: Groq SDK Safety Shield
// ============================================
// Lazy Getter pattern: Only instantiates Groq when actually needed
let groqInstance: Groq | null = null;

const getGroq = (): Groq | null => {
  if (groqInstance) return groqInstance;
  
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ [GROQ] GROQ_API_KEY not set - AI features will be disabled");
    return null;
  }
  
  try {
    groqInstance = new Groq({ apiKey });
    return groqInstance;
  } catch (error) {
    console.error("❌ [GROQ] Failed to initialize SDK:", error);
    return null;
  }
};

// Initialize Prisma
const prisma = new PrismaClient();
const groq = getGroq();

// Initialize Twilio client
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
const LOG_EMAIL = 'shaholbazaar2.0@gmail.com';

// Max retry attempts
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// WhatsApp Service with Twilio Integration
const WhatsAppService = {
  async sendMessage(phoneNumber: string, message: string, retryCount = 0): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate Twilio credentials
      if (!twilioClient) {
        console.log(`[WhatsApp] Twilio not configured. Simulating send to ${phoneNumber}: ${message.substring(0, 50)}...`);
        // Simulate success in development
        return { success: true };
      }

      // Format phone number for WhatsApp
      const formattedPhone = WhatsAppService.formatPhoneNumber(phoneNumber);
      const whatsappFrom = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
      const whatsappTo = `whatsapp:${formattedPhone}`;

      console.log(`[WhatsApp] Sending to ${whatsappTo}: ${message.substring(0, 50)}...`);

      // Send WhatsApp message via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: whatsappFrom,
        to: whatsappTo
      });

      console.log(`[WhatsApp] ✓ Message sent! SID: ${result.sid}, Status: ${result.status}`);
      return { success: true, error: undefined };

    } catch (error: any) {
      console.error(`[WhatsApp] Error (attempt ${retryCount + 1}):`, error.message);

      // Retry logic
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`[WhatsApp] Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return WhatsAppService.sendMessage(phoneNumber, message, retryCount + 1);
      }

      // Log failure after all retries exhausted
      const errorMsg = `Failed after ${MAX_RETRIES} attempts: ${error.message}`;
      await WhatsAppService.logFailure(phoneNumber, errorMsg);
      
      return { success: false, error: errorMsg };
    }
  },

  formatPhoneNumber(phone: string): string {
    // Ensure phone number is in correct format for India
    let cleaned = phone.replace(/\D/g, '');
    
    // Add +91 if not present and it's a 10-digit Indian number
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  },

  async logFailure(phoneNumber: string, error: string): Promise<void> {
    const logMessage = `[WhatsApp Failure] Phone: ${phoneNumber}, Error: ${error}, Time: ${new Date().toISOString()}`;
    console.error(logMessage);
    
    // In production, send email notification to shaholbazaar2.0@gmail.com
    // This would use a service like SendGrid, Nodemailer, etc.
    // await sendEmailAlert(LOG_EMAIL, 'WhatsApp Delivery Failed', logMessage);
  }
};

// AI Message Generator using Groq Llama 3.1
async function generateDailyMessage(
  shopName: string, 
  inquiryCount: number,
  leadCount: number,
  totalValue: number,
  category: string | null,
  whatsappClicks: number
): Promise<string> {
  // Special message when there are leads/whatsapp clicks
  if (leadCount > 0 || whatsappClicks > 0) {
    const count = Math.max(leadCount, whatsappClicks);
    return `🎉 Congratulations! You got ${count} leads today on BharatOS! Keep up the great work!`;
  }
  
  if (!groq) {
    // Fallback message without AI
    return `राम राम ${shopName}! आज शहडोल बाज़ार से आपके पास ${inquiryCount} इनक्वायरी और ${leadCount} लीड्स आए। जुड़े रहें!`;
  }
  
  try {
    const prompt = `You are the Shahdol Bazaar WhatsApp Munim (Assistant). Create a short, professional WhatsApp message for a shopkeeper in Hindi/Bagheli mix.

Shop Name: ${shopName}
Today's Inquiries: ${inquiryCount}
Today's Leads: ${leadCount}
Total Order Value: ₹${totalValue}
Category: ${category || 'General'}

Create a message that:
1. Starts with "राम राम [Shop Name]!"
2. Tells them total inquiries and leads received today
3. Gives ONE short business suggestion for tomorrow based on their category
4. Ends with a friendly note encouraging them

Keep it short, professional, and actionable. Use Hindi with some English words mixed in (common in local markets).`;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 200
    });
    
    return chatCompletion.choices[0]?.message?.content || 
      `राम राम ${shopName}! आज ${inquiryCount} इनक्वायरी और ${leadCount} लीड्स मिले। बढ़िया रहे!`;
  } catch (error) {
    console.error('[AI] Message generation failed:', error);
    return `राम राम ${shopName}! आज ${inquiryCount} इनक्वायरी और ${leadCount} लीड्स मिले। जुड़े रहें!`;
  }
}

// Data Aggregation - Get daily orders and leads for a vendor
async function getVendorDailyStats(vendorId: number): Promise<{ inquiryCount: number; leadCount: number; total: number; whatsappClicks: number }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0); // 9 PM
  
  try {
    // Get inquiries (customers interested/contacted)
    const inquiries = await prisma.inquiry.findMany({
      where: {
        vendorId: vendorId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true
      }
    });
    
    // Get leads (from Lead table)
    const leads = await prisma.lead.findMany({
      where: {
        shopId: vendorId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true
      }
    });
    
    // Get WhatsApp clicks from analytics
    const whatsappEvents = await prisma.analyticsEvent.findMany({
      where: {
        vendorId: vendorId,
        eventType: 'WHATSAPP_CLICK',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true
      }
    });
    
    const inquiryCount = inquiries.length;
    const leadCount = leads.length;
    const whatsappClicks = whatsappEvents.length;
    const total = 0; // No order value without Order model
    
    return { inquiryCount, leadCount, total, whatsappClicks };
  } catch (error) {
    console.log(`[DailySummary] Stats lookup failed for vendor ${vendorId}`);
    return { inquiryCount: 0, leadCount: 0, total: 0, whatsappClicks: 0 };
  }
}

// Log failure to email
async function logFailure(vendorId: number, shopName: string, error: string): Promise<void> {
  console.error(`[DailySummary] FAILURE - Vendor ${vendorId} (${shopName}): ${error}`);
  // In production, send email to shaholbazaar2.0@gmail.com
  // await sendEmail(LOG_EMAIL, `Daily Summary Failed - ${shopName}`, error);
}

// Main function to send daily summaries to all vendors with WhatsApp notifications enabled
export async function sendDailySummaries(): Promise<void> {
  console.log('[DailySummary] Starting daily summary job...');
  
  try {
    // Get all active vendors with phone numbers AND whatsappNotifications enabled
    const vendors = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone, mobile, category, "whatsappNotifications"
      FROM "Vendor" 
      WHERE status = 'APPROVED' 
      AND "whatsappNotifications" = true
      AND (phone IS NOT NULL OR mobile IS NOT NULL)
    `;
    
    console.log(`[DailySummary] Found ${vendors.length} vendors with WhatsApp notifications enabled`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const vendor of vendors) {
      try {
        const phone = vendor.phone || vendor.mobile;
        if (!phone) {
          await logFailure(vendor.id, vendor.name, 'No phone number');
          failureCount++;
          continue;
        }
        
        // Get daily stats
        const { inquiryCount, leadCount, total, whatsappClicks } = await getVendorDailyStats(vendor.id);
        
        // Generate AI message
        const message = await generateDailyMessage(vendor.name, inquiryCount, leadCount, total, vendor.category, whatsappClicks);
        
        // Send WhatsApp message
        const formattedPhone = WhatsAppService.formatPhoneNumber(phone);
        const result = await WhatsAppService.sendMessage(formattedPhone, message);
        
        if (result.success) {
          console.log(`[DailySummary] ✓ Sent to ${vendor.name}: ${inquiryCount} inquiries, ${leadCount} leads, ${whatsappClicks} WhatsApp clicks, ₹${total}`);
          successCount++;
        } else {
          await logFailure(vendor.id, vendor.name, result.error || 'Unknown error');
          failureCount++;
        }
        
        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (vendorError: any) {
        await logFailure(vendor.id, vendor.name, vendorError.message);
        failureCount++;
      }
    }
    
    console.log(`[DailySummary] Completed - Success: ${successCount}, Failed: ${failureCount}`);
    
  } catch (error: any) {
    console.error('[DailySummary] Critical error:', error);
    // Log to email
    await logFailure(0, 'SYSTEM', error.message);
  }
}

// Initialize the cron job
export function startDailySummaryScheduler(): void {
  // Schedule: Every day at 9:00 PM (21:00) Shahdol Time (IST)
  // node-cron uses UTC, so 9 PM IST = 3:30 PM UTC
  const cronExpression = '30 15 * * *'; // 3:30 PM UTC = 9 PM IST
  
  cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Running daily summary at 9 PM IST...');
    await sendDailySummaries();
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  console.log('[Scheduler] Daily WhatsApp summary scheduled for 9:00 PM (IST)');
}

// Export for manual trigger (useful for testing)
export { sendDailySummaries as triggerDailySummary };
