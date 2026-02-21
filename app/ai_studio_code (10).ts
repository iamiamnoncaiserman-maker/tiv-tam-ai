import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // 1. Initialize Clients
    const supabase = createClient(
      process.env.SUPABASE_URL || '', 
      process.env.SUPABASE_ANON_KEY || ''
    );
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a grocery assistant for Tiv Taam. 
      The user wants to add items to their list.
      User message: "${message}"

      Task: Extract the items and quantities. Translate the items to Hebrew.
      Return ONLY a JSON array in this exact format:
      [{"item": "Hebrew Name", "qty": number, "raw": "original english name"}]
      
      If the user is just saying hello or asking a question, return an empty array [].
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 2. Extract JSON safely
    // Changed: Using [\s\S] instead of . with the /s flag for compatibility
    let itemsToInsert: any[] = [];
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        itemsToInsert = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON Parse Error");
      }
    }

    // 3. Database Action
    if (itemsToInsert.length > 0) {
      const rows = itemsToInsert.map(i => ({
        raw_input: i.raw || 'unknown',
        hebrew_search_term: i.item || 'פריט',
        quantity: Number(i.qty) || 1,
        status: 'pending'
      }));

      const { error } = await supabase.from('shopping_list').insert(rows);
      
      if (error) {
        return Response.json({ reply: `Database error: ${error.message}` });
      }

      const itemNames = itemsToInsert.map(i => i.item).join(", ");
      return Response.json({ 
        reply: `I've added these to your list: ${itemNames}. 🛒` 
      });
    }

    // Fallback if no items were detected
    return Response.json({ reply: text });

  } catch (error: any) {
    return Response.json({ reply: `Error: ${error.message}` }, { status: 500 });
  }
}