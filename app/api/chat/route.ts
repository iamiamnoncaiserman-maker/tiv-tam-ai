import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  const { message } = await req.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are a grocery assistant for Tiv Taam. 
    User said: "${message}"
    1. Identify if they want to add items, delete items, or "Sync".
    2. If adding, translate items to Hebrew.
    3. Return a short friendly confirmation.
    
    Current Shopping List: (You will fetch this from DB)
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Here we would actually update Supabase based on the AI's intent
  
  return Response.json({ reply: text });
}
