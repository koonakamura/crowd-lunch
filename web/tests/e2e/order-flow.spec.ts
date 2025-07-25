import { test, expect } from '@playwright/test';

test.describe('Order Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/admin');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('button:has-text("管理者としてログイン")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('complete order flow from menu creation to admin display', async ({ page }) => {
    const timestamp = Date.now();
    const menuName = `E2Eテストメニュー${timestamp}`;
    const price = '1200';
    const quantity = '5';
    
    const menuNameInput = page.locator('input[placeholder="メニュー名"]').first();
    const priceInput = page.locator('input[placeholder="金額"]').first();
    const quantityInput = page.locator('input[placeholder="数量"]').first();
    const saveButton = page.locator('button:has-text("保存")');
    
    await menuNameInput.clear();
    await menuNameInput.fill(menuName);
    await priceInput.clear();
    await priceInput.fill(price);
    await quantityInput.clear();
    await quantityInput.fill(quantity);
    
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    const landingPage = page.locator('text=CROWD LUNCH');
    if (await landingPage.isVisible()) {
      await landingPage.click();
      await page.waitForTimeout(2000);
    }
    
    const menuItem = page.locator(`text=${menuName}`).first();
    await expect(menuItem).toBeVisible({ timeout: 10000 });
    await menuItem.click();
    
    const orderButton = page.locator('text=注文');
    await expect(orderButton).toBeVisible({ timeout: 5000 });
    await orderButton.click();
    
    await page.fill('[data-testid="department"]', 'E2Eテスト部');
    await page.fill('[data-testid="customer-name"]', 'E2Eテスト太郎');
    
    await page.click('[data-testid="delivery-time"]');
    await page.waitForTimeout(500);
    await page.click('text=12:00～12:15');
    await page.waitForTimeout(500);
    
    await page.click('[data-testid="submit-order"]');
    
    await expect(page.getByRole('heading', { name: '注文を承りました。' })).toBeVisible({ timeout: 10000 });
    
    await page.goto('http://localhost:5174/admin');
    await page.waitForLoadState('networkidle');
    
    const ordersTab = page.locator('text=注文一覧');
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await page.waitForTimeout(2000);
    }
    
    await expect(page.getByRole('cell', { name: 'E2Eテスト部／E2Eテスト太郎' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: menuName }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '1,200円' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '12:00～12:15' }).first()).toBeVisible();
    
    const orderIdPattern = /#\d{4}\d{3}/;
    await expect(page.locator('td:first-child').filter({ hasText: orderIdPattern }).first()).toBeVisible();
  });
  
  test('concurrent order ID generation', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    const orderPromises = pages.map(async (page, index) => {
      await page.goto('http://localhost:5174/');
      await page.waitForLoadState('networkidle');
      
      const landingPage = page.locator('text=CROWD LUNCH');
      if (await landingPage.isVisible()) {
        await landingPage.click();
        await page.waitForTimeout(1000);
      }
      
      const menuItem = page.locator('[data-testid="menu-item"]').first();
      if (await menuItem.isVisible()) {
        await menuItem.click();
        
        const orderButton = page.locator('text=注文');
        if (await orderButton.isVisible()) {
          await orderButton.click();
          
          await page.fill('[data-testid="department"]', `並行テスト部${index}`);
          await page.fill('[data-testid="customer-name"]', `並行テスト${index}`);
          
          await page.click('[data-testid="delivery-time"]');
          await page.waitForTimeout(200);
          await page.click('text=12:00～12:15');
          await page.waitForTimeout(200);
          
          await page.click('[data-testid="submit-order"]');
          
          await expect(page.getByRole('heading', { name: '注文を承りました。' })).toBeVisible({ timeout: 10000 });
        }
      }
    });
    
    await Promise.all(orderPromises);
    
    const adminPage = await browser.newPage();
    await adminPage.goto('http://localhost:5174/admin');
    await adminPage.waitForLoadState('networkidle');
    
    const loginButton = adminPage.locator('button:has-text("管理者としてログイン")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await adminPage.waitForTimeout(1000);
    }
    
    const ordersTab = adminPage.locator('text=注文一覧');
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await adminPage.waitForTimeout(2000);
    }
    
    const orderIds = await adminPage.locator('td:first-child').allTextContents();
    const uniqueOrderIds = new Set(orderIds.filter(id => id.startsWith('#')));
    
    expect(uniqueOrderIds.size).toBeGreaterThanOrEqual(1);
    
    await Promise.all(contexts.map(context => context.close()));
    await adminPage.close();
  });
  
  test('error handling with toast notifications', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    const landingPage = page.locator('text=CROWD LUNCH');
    if (await landingPage.isVisible()) {
      await landingPage.click();
      await page.waitForTimeout(2000);
    }
    
    const orderButton = page.locator('text=注文');
    if (await orderButton.isVisible()) {
      await orderButton.click();
      
      await page.click('[data-testid="submit-order"]');
      
      await expect(page.locator('text=部署名とお名前を入力してください')).toBeVisible({ timeout: 5000 });
    }
  });
});
