const { createClient } = require('@supabase/supabase-js');
const { chromium, devices } = require('playwright');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  // 1. Check Database
  const { data: items } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
  console.log(`STEP 1: Database check. Found ${items?.length || 0} items.`);
  if (!items || items.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  
  try {
    console.log("STEP 2: Navigating to Homepage...");
    await page.goto('https://www.tivtaam.co.il/', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Take a picture of the very first thing the robot sees
    await page.screenshot({ path: '1_homepage.png' });
    console.log("STEP 3: Screenshot of homepage saved.");

    console.log("STEP 4: Going directly to Login page...");
    await page.goto('https://www.tivtaam.co.il/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '2_login_page.png' });

    console.log("STEP 5: Filling Email...");
    await page.fill('input[type="email"]', process.env.TIVTAAM_USER);
    console.log("STEP 6: Filling Password...");
    await page.fill('input[type="password"]', process.env.TIVTAAM_PASS);
    
    console.log("STEP 7: Clicking Submit...");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '3_after_login.png' });

  } catch (err) {
    console.log("!!! ROBOT CRASHED !!! Reason:", err.message);
    await page.screenshot({ path: 'error_state.png' });
  } finally {
    await browser.close();
  }
}

run();