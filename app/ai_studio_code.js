const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  
  if (!items || items.length === 0) { console.log("No pending items."); return; }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    // 1. DIRECT LOGIN
    console.log("STEP 1: Going directly to Login page...");
    await page.goto('https://www.tivtaam.co.il/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log("STEP 2: Filling Credentials...");
    await page.fill('input[type="email"]', process.env.TIVTAAM_USER);
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    await page.click('button[type="submit"]');
    
    // Wait for the login button to DISAPPEAR (meaning we are in)
    console.log("STEP 3: Waiting for session to start...");
    await page.waitForFunction(() => !document.body.innerText.includes('כניסה'), { timeout: 15000 }).catch(() => console.log("Note: 'כניסה' text still visible, proceeding anyway..."));
    
    await page.screenshot({ path: '1_login_result.png' });

    // 2. ADD ITEMS LOOP
    for (const item of items) {
      console.log(`STEP 4: Searching for: ${item.hebrew_search_term}`);
      await page.goto(`https://www.tivtaam.co.il/search?q=${encodeURIComponent(item.hebrew_search_term)}`);
      await page.waitForTimeout(4000);

      // NUCLEAR OPTION: Close that left-side drawer and any overlays
      await page.evaluate(() => {
        const drawer = document.querySelector('.side-menu, .cart-sidebar, [class*="drawer"]');
        if (drawer) drawer.remove();
        const overlay = document.querySelector('.modal-backdrop, .overlay, [class*="backdrop"]');
        if (overlay) overlay.remove();
        document.body.style.overflow = 'auto'; 
        document.body.style.pointerEvents = 'auto';
      });

      try {
        // Targeted selector for the GREEN Add button found on Tiv Taam Desktop
        const addButton = page.locator('button:has-text("הוסף"), .product-add-btn, .add-to-cart, [class*="btn-add"]').first();
        
        await addButton.waitFor({ state: 'visible', timeout: 5000 });
        await addButton.click({ force: true });
        
        console.log(`✅ Success: Added ${item.hebrew_search_term}`);
        await supabase.from('shopping_list').update({ status: 'synced' }).eq('id', item.id);
      } catch (e) {
        console.log(`❌ Skipped: Could not find button for ${item.hebrew_search_term}`);
        await page.screenshot({ path: `failed_${item.id}.png` });
      }
    }

  } catch (err) {
    console.log("!!! SYSTEM ERROR !!!:", err.message);
    await page.screenshot({ path: 'error_state.png' });
  } finally {
    await browser.close();
  }
}

run();