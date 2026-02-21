import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // We'll use the model that just worked for you
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a grocery assistant for Tiv Taam. 
      User said: "${message}"

      If the user wants to add items, return a JSON array like this:
      [{"item": "חלב", "qty": 1, "raw": "milk"}]
      If they are just chatting, return the JSON and then a friendly response.
      
      Always translate items to Hebrew for the "item" field.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 1. Try to find JSON in the AI's response
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      for (const i of items) {
        await supabase.from('shopping_list').insert([
          { raw_input: i.raw, hebrew_search_term: i.item, quantity: i.qty }
        ]);
      }
      return Response.json({ reply: `Added ${items.length} items to your list! 🛒` });
    }

    return Response.json({ reply: text });
  } catch (error: any) {
    return Response.json({ reply: "Brain is on, but database is off. Check Supabase keys!" });
  }
}