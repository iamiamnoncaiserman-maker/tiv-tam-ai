import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) return Response.json({ reply: "Missing API Key" });

    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Using gemini-1.5-flash: it's free, fast, and handles Hebrew well.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a grocery assistant for Tiv Taam. 
    User said: "${message}". 
    Translate any grocery items to Hebrew and confirm.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ reply: text });

  } catch (error: any) {
    // If you still see "limit: 0", the error message below will tell us.
    return Response.json({ 
      reply: `BRAIN ERROR: ${error.message}` 
    });
  }
}