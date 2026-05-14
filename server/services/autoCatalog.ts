import { getGroq } from "../middleware/groq";

export const analyzeProductImage = async (imageUrl: string) => {
  try {
    const groq = getGroq();

    const prompt = `Analyze this product image and provide product data for e-commerce listing:
Return JSON with: title, description, categoryName, price (number), mrp (number), stock (number)

Image URL: ${imageUrl}

Respond in JSON format:
{
  "title": "string",
  "description": "string",
  "categoryName": "string",
  "price": number,
  "mrp": number,
  "stock": number
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192", // Or vision model if available
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from Groq");

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error("Auto catalog error:", error);
    throw error;
  }
};
