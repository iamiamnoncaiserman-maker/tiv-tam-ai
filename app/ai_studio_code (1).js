const { createClient } = require('@supabase/supabase-js');
const { chromium, devices } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  if (!items || items.length === 0) {
    console.log("No items found in Supabase.");
    return;
  }

  // Act like an Android phone (matches your daily experience)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  
  try {
    console.log("Navigating to Tiv Taam...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });

    // STEP 1: Handle the "Choose Branch/Delivery" popup that appears for new users
    console.log("Checking for branch selection popup...");
    try {
      // Look for buttons like "משלוח" (Delivery) or "אישור" (Confirm)
      await page.click('text=משלוח', { timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.click('button:has-text("אישור"), .confirm-btn');
    } catch (e) {
      console.log("No branch popup appeared, moving on.");
    }

    // STEP 2: Open the "Three Lines" (Hamburger Menu)
    console.log("Opening hamburger menu...");
    await page.click('button[aria-label="Menu"], .hamburger, .menu-icon').catch(() => {
        console.log("Could not find menu icon, searching for login text directly.");
    });

    // STEP 3: Click Login (התחברות)
    console.log("Clicking Login...");
    await page.click('text=התחברות').catch(() => page.goto('https://www.tivtaam.co.il/login'));

    // STEP 4: Fill Credentials
    console.log("Entering credentials...");
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    await page.click('button[type="submit"]');
    
    // Wait for the page to reload and show "Hey Amnon"
    await page.waitForTimeout(5000);

    // STEP 5: Add Items
    for (const item of items) {
      console.log(`Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      
      try {
        // Look for the "Add to Cart" button (הוסף לסל)
        const addButton = page.locator('button:has-text("הוסף"), .add-to-cart').first();
        await addButton.click({ timeout: 5000 });
        
        console.log(`✅ Added ${item.hebrew_search_term}`);
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Skipped ${item.hebrew_search_term} (requires manual selection)`);
      }
      await page.waitForTimeout(2000);
    }

    console.log("Finished! Items should now be in your basket.");

  } catch (err) {
    console.error("ROBOT FAILED:", err.message);
  } finally {
    await browser.close();
  }
}

run();