import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY?.trim(); // Trim removes any accidental spaces

    if (!geminiKey) {
      return Response.json({ reply: "DEBUG: GEMINI_API_KEY is missing in Vercel settings!" });
    }

    // Diagnostic check: key length (most keys are around 39 characters)
    console.log(`Key length: ${geminiKey.length}`);

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent("Test");
    const response = await result.response;
    
    return Response.json({ reply: `Success! Brain says: ${response.text()}` });

  } catch (error: any) {
    // This will help us see if it's a 403 (Permission), 401 (Invalid Key), or 429 (Too many requests)
    const errorDetails = error.message || "No error message";
    console.error("Full Error:", error);
    
    return Response.json({ 
      reply: `GEMINI ERROR: ${errorDetails}. Check if your API key is correct in Vercel and has no extra spaces.` 
    });
  }
}