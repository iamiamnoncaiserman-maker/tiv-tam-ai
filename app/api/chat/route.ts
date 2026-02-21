import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const supabase = createClient(
      process.env.SUPABASE_URL || '', 
      process.env.SUPABASE_ANON_KEY || ''
    );
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // 1. DISCOVERY: Try different model names to avoid the 404
    const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash"];
    let model;
    let successfulName = "";

    for (const name of modelNames) {
      try {
        const testModel = genAI.getGenerativeModel({ model: name });
        // Quick test call
        const testResult = await testModel.generateContent("hi");
        await testResult.response;
        model = testModel;
        successfulName = name;
        break; 
      } catch (e) {
        continue;
      }
    }

    if (!model) {
      return Response.json({ reply: "Google is connected, but the models (1.5/2.0) are not found. Please check your AI Studio project." });
    }

    // 2. THE GROCERY LOGIC
    const prompt = `
      You are a grocery assistant for Tiv Taam. 
      User: "${message}"
      Task: If adding items, return ONLY a JSON array: [{"item": "Hebrew Name", "qty": number, "raw": "english"}]
      Otherwise, just chat. Always translate to Hebrew.
    `;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    // 3. DATABASE ACTION
    let items: any[] = [];
    const jsonMatch = text.match(/\[[\s\S]*\]/); // Compatible multi-line regex
    
    if (jsonMatch) {
      try {
        items = JSON.parse(jsonMatch[0]);
        const rows = items.map(i => ({
          raw_input: i.raw,
          hebrew_search_term: i.item,
          quantity: i.qty,
          status: 'pending'
        }));

        await supabase.from('shopping_list').insert(rows);
        return Response.json({ reply: `Added to list: ${items.map(i => i.item).join(", ")}. (Using ${successfulName})` });
      } catch (e) {
        console.log("JSON Parse failed");
      }
    }

    return Response.json({ reply: text });

  } catch (error: any) {
    return Response.json({ reply: `Error: ${error.message}` }, { status: 500 });
  }
}
