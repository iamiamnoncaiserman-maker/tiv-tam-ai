const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  if (!items || items.length === 0) { console.log("No items."); return; }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }, // Standard Laptop width
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log("STEP 2: Navigating to Tiv Taam...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });
    
    // NUCLEAR OPTION: Delete all banners and overlays that block clicks
    await page.evaluate(() => {
      const selectors = ['.smartbanner', '.app-banner', '#smartbanner', '.modal-backdrop', '.overlay'];
      selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
      document.body.style.overflow = 'auto'; // Re-enable scrolling if a popup locked it
    });
    await page.keyboard.press('Escape');

    // STEP 3: Click Login (כניסה)
    console.log("STEP 3: Clicking 'כניסה' in the header...");
    await page.click('text=כניסה', { timeout: 15000, force: true });
    
    // STEP 4: Fill the Modal
    console.log("STEP 4: Filling Login Modal...");
    const emailField = page.locator('input[placeholder*="דואר"], input[type="email"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 15000 });
    
    await emailField.fill(process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    
    console.log("STEP 5: Submitting login...");
    await page.click('button:has-text("כניסה"), .login-submit-btn', { force: true });
    await page.waitForTimeout(6000); // Give extra time for the session to load
    
    await page.screenshot({ path: '1_logged_in_check.png' });

    // STEP 6: Add Items
    for (const item of items) {
      console.log(`STEP 6: Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(4000);

      try {
        // Look for the GREEN '+' or 'הוסיפו' button from your screenshot
        const addButton = page.locator('button:has-text("הוסיפו"), button:has-text("הוסף"), .product-add-btn, [aria-label*="הוסף"]').first();
        await addButton.click({ timeout: 5000, force: true });
        
        console.log(`✅ Success: Added ${item.hebrew_search_term}`);
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Skipped: Could not find Add button for ${item.hebrew_search_term}`);
        await page.screenshot({ path: `failed_${item.id}.png` });
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
