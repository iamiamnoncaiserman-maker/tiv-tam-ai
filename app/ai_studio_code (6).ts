import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) return Response.json({ reply: "API Key missing in Vercel." });

    const genAI = new GoogleGenerativeAI(geminiKey);

    // We will try the most likely "Free Tier" model names for 2026.
    const modelNames = [
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest"
    ];

    let model;
    let successfulModelName = "";

    // Loop through names until one works
    for (const name of modelNames) {
      try {
        const testModel = genAI.getGenerativeModel({ model: name });
        // Quick test to see if the model exists and we have quota
        const testResult = await testModel.generateContent("ping");
        await testResult.response;
        
        model = testModel;
        successfulModelName = name;
        break; // We found a working model!
      } catch (e) {
        console.log(`Model ${name} failed, trying next...`);
        continue;
      }
    }

    if (!model) {
      return Response.json({ reply: "Google is connected, but all model names (1.5, 2.0) failed. Check AI Studio for the exact model name." });
    }

    // Now run your real grocery logic
    const prompt = `You are a grocery assistant for Tiv Taam. 
    User message: "${message}". 
    (Active Model: ${successfulModelName}).
    Confirm the items and translate to Hebrew.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return Response.json({ reply: text });

  } catch (error: any) {
    return Response.json({ reply: `ERROR: ${error.message}` });
  }
}