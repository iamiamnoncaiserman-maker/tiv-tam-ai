import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) return Response.json({ reply: "Missing API Key" });

    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // We will try 'gemini-1.5-flash', and if that 404s, we try 'gemini-1.5-pro'
    let model;
    try {
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Test connection");
        await result.response;
    } catch (e: any) {
        if (e.message.includes("404")) {
            console.log("Flash failed, trying Pro...");
            model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        } else {
            throw e;
        }
    }

    // Now run the real prompt
    const prompt = `You are a grocery assistant for Tiv Taam. User: ${message}. Respond in English/Hebrew.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return Response.json({ reply: response.text() });

  } catch (error: any) {
    return Response.json({ 
      reply: `STILL ERROR: ${error.message}. Try checking if you are using a work/school Google account (those often block the API).` 
    });
  }
}