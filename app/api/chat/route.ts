import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // 1. Move the keys inside the function so they are called at runtime
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 2. Safety check: If keys are missing, don't crash, return a clear error
  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    return Response.json({ 
      reply: "Error: Environment variables are missing on the server. Please check Vercel settings." 
    }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    const { message } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a grocery assistant for Tiv Taam. The user said: "${message}". 
    Translate any grocery items to Hebrew and confirm you've added them.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ reply: text });
  } catch (error) {
    console.error(error);
    return Response.json({ reply: "I had trouble connecting to the brain. Try again?" }, { status: 500 });
  }
}
