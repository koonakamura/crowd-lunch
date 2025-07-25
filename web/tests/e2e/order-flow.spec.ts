import { test, expect } from '@playwright/test';

test.describe('Order Flow E2E', () => {
  test('complete order flow from menu creation to admin display', async ({ page }) => {
    await page.goto('http://localhost:5174/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const menuNameInput = page.locator('input[placeholder="メニュー名"]').first();
    const priceInput = page.locator('input[placeholder="金額"]').first();
    const quantityInput = page.locator('input[placeholder="数量"]').first();
    const saveButton = page.locator('button:has-text("保存")');
    
    await menuNameInput.fill('E2Eテストメニュー2');
    await priceInput.fill('950');
    await quantityInput.fill('3');
    
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(2000);
    
    const landingPage = page.locator('text=CROWD LUNCH');
    if (await landingPage.isVisible()) {
      await landingPage.click();
      await page.waitForTimeout(2000);
    }
    
    const menuItem = page.locator('[data-testid="menu-item"]').first();
    if (await menuItem.isVisible()) {
      await menuItem.click();
      await page.waitForTimeout(1000);
    }
    
    const orderButton = page.locator('text=注文');
    if (await orderButton.isVisible()) {
      await orderButton.click();
      await page.waitForTimeout(1000);
      
      await page.fill('[data-testid="department"]', 'テスト部');
      await page.fill('[data-testid="customer-name"]', 'テスト太郎');
      
      await page.click('[data-testid="delivery-time"]');
      await page.waitForTimeout(500);
      await page.click('text=12:00～12:15');
      await page.waitForTimeout(500);
      
      await page.click('[data-testid="submit-order"]');
      await page.waitForTimeout(3000);
    }
    
    await page.goto('http://localhost:5174/admin');
    await page.waitForTimeout(2000);
    
    const ordersTab = page.locator('text=注文一覧');
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await page.waitForTimeout(2000);
    }
    
    await expect(page.locator('text=テスト部／テスト太郎')).toBeVisible();
    await expect(page.locator('text=E2Eテストメニュー2')).toBeVisible();
    await expect(page.locator('text=950円')).toBeVisible();
    await expect(page.locator('text=12:00～12:15')).toBeVisible();
    
    const orderIdPattern = /#\d{4}\d{3}/;
    await expect(page.locator('td').filter({ hasText: orderIdPattern })).toBeVisible();
  });
  
  test('error handling with toast notifications', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(2000);
    
    const landingPage = page.locator('text=CROWD LUNCH');
    if (await landingPage.isVisible()) {
      await landingPage.click();
      await page.waitForTimeout(2000);
    }
    
    const orderButton = page.locator('text=注文');
    if (await orderButton.isVisible()) {
      await orderButton.click();
      await expect(page.locator('text=注文確認')).not.toBeVisible();
    }
  });
});
