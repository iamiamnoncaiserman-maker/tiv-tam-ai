const { createClient } = require('@supabase/supabase-js');
const { chromium, devices } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  // LOG: See what's in the DB
  const { data: items, error } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  if (error) { console.log("DB Error:", error.message); return; }
  console.log(`Found ${items?.length || 0} pending items in database.`);

  if (!items || items.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  
  try {
    console.log("Navigating to Tiv Taam...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Escape'); 

    // LOGIN PHASE
    console.log("Attempting Login...");
    await page.goto('https://www.tivtaam.co.il/login');
    await page.fill('input[type="email"]', process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // DEBUG: Take a screenshot to see if we are logged in
    await page.screenshot({ path: 'login_check.png' });
    console.log("Screenshot saved as login_check.png (Check GitHub artifacts)");

    // ADDING PHASE
    for (const item of items) {
      console.log(`Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(3000);

      try {
        // Tiv Taam often uses a 'plus' icon or 'הוסף' text. 
        // We will try to find any button that looks like an "Add" button.
        const addButton = page.locator('button:has-text("הוסף"), [aria-label*="הוסף"], .product-add-btn').first();
        
        await addButton.scrollIntoViewIfNeeded();
        await addButton.click({ timeout: 5000 });
        
        console.log(`✅ Clicked ADD for ${item.hebrew_search_term}`);
        
        // Update DB
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Failed to find Add button for ${item.hebrew_search_term}`);
      }
    }

  } catch (err) {
    console.error("ROBOT ERROR:", err.message);
  } finally {
    await browser.close();
  }
}

run();