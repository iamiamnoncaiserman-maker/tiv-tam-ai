import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Updated list for 2026: Google is moving everyone to 3.x and 2.x
    const modelNames = [
      "gemini-3.1-pro", 
      "gemini-2.5-flash", 
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest"
    ];

    let model;
    let usedName = "";

    for (const name of modelNames) {
      try {
        const testModel = genAI.getGenerativeModel({ model: name });
        const test = await testModel.generateContent("hi");
        await test.response;
        model = testModel;
        usedName = name;
        break; 
      } catch (e) { continue; }
    }

    if (!model) {
      return Response.json({ reply: "Connection established, but Google is not finding any models (3.1/2.5/1.5). This usually means your Google Project is still initializing. Try again in 5 minutes." });
    }

    const prompt = `You are a grocery assistant for Tiv Taam. User: "${message}". Translate items to Hebrew and return as JSON: [{"item": "Hebrew", "qty": 1, "raw": "English"}] or just chat.`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    let items: any[] = [];
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        items = JSON.parse(jsonMatch[0]);
        await supabase.from('shopping_list').insert(items.map(i => ({
          raw_input: i.raw,
          hebrew_search_term: i.item,
          quantity: i.qty,
          status: 'pending'
        })));
        return Response.json({ reply: `Success! Added to list: ${items.map(i => i.item).join(", ")}. (Model: ${usedName})` });
      } catch (e) { /* ignore parse error */ }
    }

    return Response.json({ reply: text });
  } catch (error: any) {
    return Response.json({ reply: `ERROR: ${error.message}` });
  }
}
