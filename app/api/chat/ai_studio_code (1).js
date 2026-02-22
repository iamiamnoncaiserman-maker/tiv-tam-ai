const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  if (!items || items.length === 0) { console.log("No pending items."); return; }

  const browser = await chromium.launch({ headless: true });
  // Desktop view is more stable for login persistence
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log("STEP 1: Navigating to Tiv Taam...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Escape');

    // STEP 2: OPEN LOGIN MODAL
    console.log("STEP 2: Clicking 'כניסה'...");
    await page.click('text=כניסה', { force: true });
    
    // STEP 3: FILL MODAL (Using the exact placeholders from your screenshot)
    console.log("STEP 3: Filling Login Modal...");
    await page.waitForSelector('input[placeholder*="דואר"]', { timeout: 10000 });
    await page.fill('input[placeholder*="דואר"]', process.env.TIVTAAM_USER);
    await page.fill('input[placeholder*="סיסמה"]', process.env.TIVTAAM_PASS);
    
    // Take a picture of the filled modal
    await page.screenshot({ path: '1_modal_filled.png' });
    
    console.log("STEP 4: Submitting Login...");
    await page.click('button:has-text("כניסה"), .login-submit-btn');
    
    // CRITICAL: Wait for the "כניסה" button to DISAPPEAR from the header
    console.log("STEP 5: Waiting for login to 'stick'...");
    await page.waitForFunction(() => {
      const header = document.querySelector('header') || document.body;
      return !header.innerText.includes('כניסה');
    }, { timeout: 20000 }).catch(() => console.log("Timeout waiting for login to stick, but proceeding..."));

    await page.screenshot({ path: '2_post_login_home.png' });

    // STEP 6: ADD ITEMS LOOP
    for (const item of items) {
      console.log(`STEP 6: Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(4000);

      // Remove the left-side drawer and overlays that block clicks
      await page.evaluate(() => {
        const blockers = ['.side-menu', '.cart-sidebar', '.modal-backdrop', '.overlay', '[class*="drawer"]'];
        blockers.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
        document.body.style.overflow = 'auto';
        document.body.style.pointerEvents = 'auto';
      });

      try {
        // Find the GREEN "הוסיפו" button
        const addButton = page.locator('button:has-text("הוסיפו"), button:has-text("הוסף"), .product-add-btn').first();
        await addButton.waitFor({ state: 'visible', timeout: 5000 });
        
        // Use a coordinate click to bypass invisible layers
        const box = await addButton.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          console.log(`✅ Success: Added ${item.hebrew_search_term}`);
          await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
        }
      } catch (e) {
        console.log(`❌ Skipped: Could not click Add for ${item.hebrew_search_term}`);
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