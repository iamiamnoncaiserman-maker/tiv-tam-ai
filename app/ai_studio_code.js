const { createClient } = require('@supabase/supabase-js');
const { chromium, devices } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  console.log(`STEP 1: DB check. Found ${items?.length || 0} items.`);
  if (!items || items.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  
  try {
    console.log("STEP 2: Navigating to Tiv Taam...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });
    
    // 1. Close any initial banners (like the App Install one)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);

    // 2. Click the "כניסה" button in the top left (from your screenshot)
    console.log("STEP 3: Clicking the 'כניסה' button in the header...");
    await page.click('text=כניסה');
    
    // 3. Wait for the login modal to appear
    console.log("STEP 4: Waiting for login modal...");
    await page.waitForSelector('input[placeholder*="דואר"], input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: '1_modal_open.png' });

    // 4. Fill in credentials in the modal
    console.log("STEP 5: Filling credentials...");
    await page.fill('input[placeholder*="דואר"], input[type="email"]', process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    
    // 5. Click the green "כניסה" button inside the modal
    console.log("STEP 6: Clicking the green submit button...");
    await page.click('button:has-text("כניסה"), .login-submit-btn');
    
    await page.waitForTimeout(5000); // Wait for login to complete
    await page.screenshot({ path: '2_after_login.png' });

    // --- ADDING SECTION ---
    for (const item of items) {
      console.log(`STEP 7: Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(3000);

      try {
        // Look for "הוסף לסל" or similar Add buttons
        const addButton = page.locator('button:has-text("הוסף"), [aria-label*="הוסף"], .add-to-cart').first();
        await addButton.click({ timeout: 5000 });
        
        console.log(`✅ Success: Added ${item.hebrew_search_term}`);
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Skipped: Could not find Add button for ${item.hebrew_search_term}`);
      }
    }

  } catch (err) {
    console.log("!!! ERROR !!!:", err.message);
    await page.screenshot({ path: 'error_state.png' });
  } finally {
    await browser.close();
  }
}

run();