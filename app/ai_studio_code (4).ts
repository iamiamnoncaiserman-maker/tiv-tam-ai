import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) return Response.json({ reply: "Missing API Key in Vercel." });

    const genAI = new GoogleGenerativeAI(geminiKey);

    // 1. DISCOVERY: Let's find out what model names your account actually supports
    // This solves the 404 issue by picking the right model for your region.
    let modelName = "gemini-2.0-flash"; // Defaulting to the newer 2026 standard

    try {
      // This part is the "Brain Scanner"
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Test");
      await result.response;
    } catch (e: any) {
      if (e.message.includes("404")) {
        // If 2.0 fails, we try the 2.5 version which is common in early 2026
        modelName = "gemini-2.5-flash"; 
      }
    }

    const finalModel = genAI.getGenerativeModel({ model: modelName });

    // 2. RUN THE REAL PROMPT
    const prompt = `You are a grocery assistant for Tiv Taam. 
    User message: "${message}". 
    (Debug Info: Using model ${modelName}).
    Translate grocery items to Hebrew and confirm.`;

    const result = await finalModel.generateContent(prompt);
    const text = result.response.text();

    return Response.json({ reply: text });

  } catch (error: any) {
    return Response.json({ 
      reply: `CONNECTION ERROR: ${error.message}. Please check if the 'Generative Language API' is enabled in your Google Cloud Console.` 
    });
  }
}