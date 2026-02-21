import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) return Response.json({ reply: "API Key missing in Vercel." });

    const genAI = new GoogleGenerativeAI(geminiKey);

    // These are the specific model names for February 2026
    const modelNames = [
      "gemini-3.1-pro-preview", // The one your dashboard is suggesting!
      "gemini-3-flash-preview", 
      "gemini-2.5-flash"        // The stable 2025/26 workhorse
    ];

    let model;
    let successfulModelName = "";

    for (const name of modelNames) {
      try {
        const testModel = genAI.getGenerativeModel({ model: name });
        // We do a very small test call
        const testResult = await testModel.generateContent("hi");
        await testResult.response;
        
        model = testModel;
        successfulModelName = name;
        break; 
      } catch (e) {
        console.log(`Model ${name} not available, trying next...`);
        continue;
      }
    }

    if (!model) {
      return Response.json({ reply: "I can see your Google project is active, but the model names (3.1, 2.5) are not responding. Try 'gemini-1.5-flash' one last time?" });
    }

    const prompt = `You are a grocery assistant for Tiv Taam. User: "${message}". 
    (Model: ${successfulModelName}). Translate items to Hebrew.`;

    const result = await model.generateContent(prompt);
    return Response.json({ reply: result.response.text() });

  } catch (error: any) {
    return Response.json({ reply: `ERROR: ${error.message}` });
  }
}