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

// Initialize Twilio
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
const LOG_EMAIL = 'shaholbazaar2.0@gmail.com';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Get current Shahdol time (IST)
function getShahdolTime(): Date {
  return new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // UTC + 5:30
}

function getShahdolHour(): number {
  return getShahdolTime().getHours();
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Log to shaholbazaar2.0@gmail.com context
async function logAgentAction(agentName: string, vendorId: number, action: string, details: string): Promise<void> {
  const logEntry = `[${agentName}] ${new Date().toISOString()} | Vendor: ${vendorId} | Action: ${action} | Details: ${details}`;
  console.log(logEntry);
  // In production: await sendEmail(LOG_EMAIL, `${agentName} Action`, logEntry);
}

// Send WhatsApp message with retry
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!twilioClient) {
    console.log(`[Agent WhatsApp] Simulating send to ${phone}: ${message.substring(0, 50)}...`);
    return true;
  }
  
  try {
    const formattedPhone = formatPhoneNumber(phone);
    await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${formattedPhone}`
    });
    return true;
  } catch (error: any) {
    console.error(`[Agent WhatsApp] Failed:`, error.message);
    return false;
  }
}

// ==========================================
// GROWTH AGENT
// Analyzes shop data every 6 hours and sends recovery strategies
// ==========================================

async function runGrowthAgent(): Promise<void> {
  console.log('[GrowthAgent] Starting analysis...');
  
  try {
    // Get vendors with low activity (no new products in 7 days or low orders)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const vendors = await prisma.$queryRaw<any[]>`
      SELECT v.id, v.name, v.phone, v.mobile, v.category, v.status,
             (SELECT COUNT(*) FROM \"Product\" p WHERE p.\"vendorId\" = v.id AND p.\"createdAt\" > ${sevenDaysAgo}) as recent_products,
             (SELECT COUNT(*) FROM \"Inquiry\" i WHERE i.\"vendorId\" = v.id AND i.\"createdAt\" > ${sevenDaysAgo}) as recent_inquiries
      FROM \"Vendor\" v
      WHERE v.status = 'APPROVED' AND (v.phone IS NOT NULL OR v.mobile IS NOT NULL)
    `;
    
    const lowActivityVendors = vendors.filter((v: any) => 
      v.recent_products === 0 || v.recent_inquiries < 3
    );
    
    console.log(`[GrowthAgent] Found ${lowActivityVendors.length} vendors with low activity`);
    
    for (const vendor of lowActivityVendors) {
      try {
        // Generate recovery strategy using Groq Llama 3.1
        const recoveryMessage = await generateRecoveryStrategy(vendor);
        
        // Send via WhatsApp
        const phone = vendor.phone || vendor.mobile;
        const sent = await sendWhatsAppMessage(phone, recoveryMessage);
        
        await logAgentAction('GrowthAgent', vendor.id, 'RECOVERY_STRATEGY_SENT', 
          `Products: ${vendor.recent_products}, Inquiries: ${vendor.recent_inquiries}, Sent: ${sent}`);
          
      } catch (error: any) {
        await logAgentAction('GrowthAgent', vendor.id, 'ERROR', error.message);
      }
    }
    
    console.log('[GrowthAgent] Analysis complete');
    
  } catch (error: any) {
    console.error('[GrowthAgent] Critical error:', error);
    await logAgentAction('GrowthAgent', 0, 'CRITICAL_ERROR', error.message);
  }
}

// Generate recovery strategy using Groq
async function generateRecoveryStrategy(vendor: any): Promise<string> {
  if (!groq) {
    return `राम राम ${vendor.name}! आपके शहडोल बाज़ार स्टोर में पिछले 7 दिनों में कोई नया प्रोडक्ट नहीं आया है। नए प्रोडक्ट जोड़ें और अपने ग्राहकों को खुश करें!`;
  }
  
  const prompt = `You are the Shahdol Bazaar Growth Agent. A shop "${vendor.name}" in category "${vendor.category || 'General'}" has low activity (0 products or less than 3 inquiries in 7 days).

Create a short, motivating recovery strategy message in Hindi/Bagheli mix for the shopkeeper.

The message should:
1. Start with "राम राम [Shop Name]!"
2. Acknowledge their current situation kindly
3. Give 2-3 specific actionable suggestions to recover
4. End with motivation to keep going

Keep it short and conversational.`;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 200
  });
  
  return chatCompletion.choices[0]?.message?.content || 
    `राम राम ${vendor.name}! नए प्रोडक्ट जोड़ें और बिक्री बढ़ाएं!`;
}

// ==========================================
// COMMUNITY AGENT
// Scans trends and generates flash sale suggestions
// ==========================================

// Mock trending data (in production, fetch from real APIs)
const TRENDING_SCENARIOS = [
  { trigger: 'rain', keywords: ['rain', 'monsoon', 'बारिश'], suggestion: 'छाता, रेनकोट, और वॉटरप्रूफ जूते की बिक्री बढ़ाएं!' },
  { trigger: 'summer', keywords: ['summer', 'hot', 'गर्मी'], suggestion: 'ठंडा पानी, शर्बत, और सनस्क्रीन की बिक्री बढ़ाएं!' },
  { trigger: 'festival', keywords: ['festival', 'diwali', 'त्योहार'], suggestion: 'उपहार, सजावट, और मिठाई की दुकानों के लिए बिक्री बढ़ाने का समय!' },
  { trigger: 'exam', keywords: ['exam', 'परीक्षा'], suggestion: 'किताबें, नोट्स, और स्टेशनरी की मांग बढ़ रही है!' },
  { trigger: 'default', keywords: [], suggestion: 'नए प्रोडक्ट जोड़ें और ग्राहकों को आकर्षित करें!' }
];

async function runCommunityAgent(): Promise<void> {
  console.log('[CommunityAgent] Scanning for trends...');
  
  try {
    // Determine current trend based on season/month
    const month = getShahdolTime().getMonth(); // 0-11
    let currentScenario = TRENDING_SCENARIOS[TRENDING_SCENARIOS.length - 1]; // default
    
    // Simple seasonal logic (India)
    if (month >= 6 && month <= 9) currentScenario = TRENDING_SCENARIOS[0]; // monsoon
    else if (month >= 3 && month <= 5) currentScenario = TRENDING_SCENARIOS[1]; // summer
    else if (month === 9 || month === 10) currentScenario = TRENDING_SCENARIOS[2]; // diwali
    else if (month === 1 || month === 2) currentScenario = TRENDING_SCENARIOS[3]; // exams
    
    // Find relevant vendors based on category
    const relevantKeywords = currentScenario.trigger === 'default' ? [] : currentScenario.keywords;
    const categoryMatch = currentScenario.trigger === 'rain' ? ['Grocery', 'Medical', 'General'] :
                         currentScenario.trigger === 'summer' ? ['Grocery', 'Electronics'] :
                         currentScenario.trigger === 'festival' ? ['Jewelry', 'Home Decor', 'Grocery'] :
                         currentScenario.trigger === 'exam' ? ['Books', 'Stationery'] : [];
    
    // Get vendors in relevant categories - Using Prisma for safe parameterized queries
    const vendorWhere: any = { status: 'APPROVED' };
    if (categoryMatch.length > 0) {
      vendorWhere.category = { in: categoryMatch };
    }
    
    const vendors = await prisma.vendor.findMany({
      where: vendorWhere,
      take: 20,
      select: { id: true, name: true, phone: true, mobile: true, category: true }
    });
    
    console.log(`[CommunityAgent] Found ${vendors.length} relevant vendors for "${currentScenario.trigger}" trend`);
    
    for (const vendor of vendors) {
      try {
        const flashSaleMessage = await generateFlashSaleSuggestion(vendor, currentScenario.suggestion);
        
        const phone = vendor.phone || vendor.mobile || "";
        if (!phone) {
          console.warn(`[CommunityAgent] Vendor ${vendor.id} has no phone number, skipping`);
          continue;
        }
        await sendWhatsAppMessage(phone, flashSaleMessage);
        
        await logAgentAction('CommunityAgent', vendor.id, 'FLASH_SALE_SUGGESTION', 
          `Trend: ${currentScenario.trigger}`);
          
      } catch (error: any) {
        await logAgentAction('CommunityAgent', vendor.id, 'ERROR', error.message);
      }
    }
    
    console.log('[CommunityAgent] Trend scan complete');
    
  } catch (error: any) {
    console.error('[CommunityAgent] Critical error:', error);
    await logAgentAction('CommunityAgent', 0, 'CRITICAL_ERROR', error.message);
  }
}

// Generate flash sale suggestion
async function generateFlashSaleSuggestion(vendor: any, baseSuggestion: string): Promise<string> {
  if (!groq) {
    return `🌟 फ्लैश सेल अलर्ट! ${vendor.name} - ${baseSuggestion}`;
  }
  
  const prompt = `You are the Shahdol Bazaar Community Agent. A shop "${vendor.name}" in "${vendor.category || 'General'}" category can benefit from current market trends.

Base suggestion: ${baseSuggestion}

Create a short, exciting flash sale suggestion message in Hindi/Bagheli mix. The message should:
1. Start with "🌟 फ्लैश सेल अलर्ट!"
2. Mention the current opportunity
3. Give one specific tip to capitalize on the trend
4. Keep it under 100 words

Be enthusiastic and motivating!`;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.8,
    max_tokens: 150
  });
  
  return chatCompletion.choices[0]?.message?.content || 
    `🌟 फ्लैश सेल अलर्ट! ${vendor.name} - ${baseSuggestion}`;
}

// ==========================================
// SCHEDULER SETUP
// ==========================================

export function startAgentSwarm(): void {
  // Growth Agent: Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[AgentSwarm] Running Growth Agent (every 6 hours)...');
    await runGrowthAgent();
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  // Community Agent: Once daily at 7 AM Shahdol time
  cron.schedule('30 1 * * *', async () => {
    console.log('[AgentSwarm] Running Community Agent (daily at 7 AM)...');
    await runCommunityAgent();
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  console.log('[AgentSwarm] Autonomous agents started:');
  console.log('  - Growth Agent: Every 6 hours');
  console.log('  - Community Agent: Daily at 7 AM IST');
}

// Manual trigger functions for testing
export async function triggerGrowthAgent(): Promise<void> {
  await runGrowthAgent();
}

export async function triggerCommunityAgent(): Promise<void> {
  await runCommunityAgent();
}
