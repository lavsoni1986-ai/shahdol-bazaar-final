// @ts-nocheck
import { prisma } from "../storage";
import { getGroq } from "../middleware/groq";

export const runSovereignConnectEngine = async (): Promise<void> => {
  // १. आगामी त्योहारों का पता लगाना
  const upcomingFestivals = await prisma.festiveEvent.findMany({
    where: { startDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, endDate: { gte: new Date() } }
  });

  for (const event of upcomingFestivals) {
    // 🛡️ Sovereign Guard: districtId null check
    if (!event.districtId) continue;

    // २. वेंडर्स का 'Opportunity Gap' कैलकुलेट करना
    const insights = await prisma.vendorInsight.findMany({
      where: { districtId: event.districtId, potentialRevenueLoss: { gte: 3000 } },
      include: { vendor: true }
    });

    for (const insight of insights) {
      // 🛡️ Sovereign Guard: potentialRevenueLoss null check
      if (!insight.potentialRevenueLoss || insight.potentialRevenueLoss < 3000) continue;
      if (!insight.vendor.phone) continue;

      const groq = getGroq();
      const prompt = `वेंडर ${insight.vendor.name} के लिए ${event.name} पर ₹${insight.potentialRevenueLoss} का नुकसान होने वाला है। लव कुमार सोनी (फाउंडर) के १० साल के मीडिया अनुभव का हवाला देते हुए एक छोटा संदेश लिखें जो उन्हें लव भाई से व्हाट्सएप पर बात करने के लिए प्रेरित करे।`;

      const aiResponse = await groq?.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      });

      // 📲 ३. लव भाई का डायरेक्ट व्हाट्सएप लिंक
      const contactUrl = `https://wa.me/919753239303?text=नमस्ते%20लव%20भाई,%20मैं%20${insight.vendor.name}%20से%20हूँ।%20मुझे%20${event.name}%20के%20लिए%20फ्री%20ग्रोथ%20सलाह%20चाहिए।`;

      console.log(`📡 Sending Opportunity to ${insight.vendor.name}...`);
      // Twilio के ज़रिए aiResponse.content + contactUrl भेजें
    }
  }
};
