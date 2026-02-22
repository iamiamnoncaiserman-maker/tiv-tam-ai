const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  console.log(`STEP 1: DB check. Found ${items?.length || 0} items.`);
  if (!items || items.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  // We use a WIDER screen (iPad Landscape) to make the layout easier
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  
  try {
    console.log("STEP 2: Navigating to Tiv Taam (Landscape Mode)...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });
    
    // Remove the banner that blocks the header
    await page.evaluate(() => {
      const banner = document.querySelector('.smartbanner, #smartbanner, .app-banner, [class*="banner"]');
      if (banner) banner.remove();
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);

    // STEP 3: Click Login (כניסה)
    console.log("STEP 3: Clicking 'כניסה' in the header...");
    // On landscape, 'כניסה' is usually at the top left.
    await page.click('text=כניסה', { timeout: 15000, force: true });
    
    // STEP 4: Fill the Modal (based on your iPad screenshot)
    console.log("STEP 4: Filling Login Modal...");
    const emailField = page.locator('input[placeholder*="דואר"], input[type="email"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 10000 });
    
    await emailField.fill(process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    
    console.log("STEP 5: Submitting login...");
    await page.click('button:has-text("כניסה"), .login-submit-btn', { force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '1_logged_in_check.png' });

    // STEP 6: Add Items
    for (const item of items) {
      console.log(`STEP 6: Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(3000);

      try {
        // We look for the green button you saw: "הוסיפו" or "+" or "הוסף"
        const addButton = page.locator('button:has-text("הוסיפו"), button:has-text("הוסף"), .add-to-cart-btn, [aria-label*="הוסף"]').first();
        await addButton.click({ timeout: 5000, force: true });
        
        console.log(`✅ Success: Added ${item.hebrew_search_term}`);
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Skipped: Could not find Add button for ${item.hebrew_search_term}`);
        await page.screenshot({ path: `failed_${item.raw_input}.png` });
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
