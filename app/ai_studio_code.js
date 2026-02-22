const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  // 1. Get the list from Supabase
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  if (!items || items.length === 0) {
    console.log("No items to add.");
    return;
  }

  // 2. Start Browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Logging into Tiv Taam...");
  await page.goto('https://www.tivtaam.co.il/login');
  
  // Login Logic (Specific to Tiv Taam selectors)
  await page.fill('input[type="email"]', process.env.TIVTAAM_USER);
  await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 3. Add Items Loop
  for (const item of items) {
    console.log(`Searching for: ${item.hebrew_search_term}`);
    await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
    try {
      // Clicks the first 'Add to Cart' button found
      await page.click('button.add-to-cart-btn', { timeout: 5000 }); 
      console.log(`Added ${item.hebrew_search_term}`);
      
      // Mark as synced in DB
      await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
    } catch (e) {
      console.log(`Could not find ${item.hebrew_search_term}`);
    }
  }

  await browser.close();
}

run();