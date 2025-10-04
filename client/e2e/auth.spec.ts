import { test, expect } from '@playwright/test';

/**
 * E2E Test: Автентифікація користувача
 * Сценарій: Реєстрація нового користувача → Вихід → Логін
 */

test.describe('Автентифікація користувача', () => {
  // Генеруємо унікальні дані для кожного тесту
  const timestamp = Date.now();
  const testUser = {
    username: `testuser${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  // Перевірка що backend запущений
  test.beforeAll(async ({ request }) => {
    try {
      await request.get('http://localhost:3000/api/auth/profile');
      console.log('✅ Backend is running on port 3000');
    } catch (error) {
      console.error('❌ Backend is NOT running! Please start it with: npm start');
      throw new Error('Backend server is not running on http://localhost:3000');
    }
  });

  test('повний цикл: реєстрація → вихід → логін', async ({ page }) => {
    // Логування network requests для діагностики
    page.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        console.log('📤 Register request:', {
          url: request.url(),
          method: request.method(),
          postData: request.postDataJSON()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/auth/register')) {
        const body = await response.text().catch(() => 'Could not read body');
        console.log('📥 Register response:', {
          status: response.status(),
          body: body.substring(0, 200)
        });
      }
    });

    // ========== КРОК 1: Реєстрація ==========
    await test.step('Реєстрація нового користувача', async () => {
      await page.goto('/register');

      // Чекаємо на завантаження сторінки
      await expect(page.locator('h1')).toContainText('Реєстрація');

      // Заповнюємо форму реєстрації через placeholder
      await page.getByPlaceholder('Ваше ім\'я').fill(testUser.username);
      await page.getByPlaceholder('your@email.com').fill(testUser.email);

      // Заповнюємо паролі (перше поле - основний пароль, друге - підтвердження)
      await page.locator('input[type="password"]').first().fill(testUser.password);
      await page.locator('input[type="password"]').nth(1).fill(testUser.password);

      // Натискаємо кнопку реєстрації і чекаємо на навігацію
      await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }),
        page.getByRole('button', { name: 'Зареєструватися', exact: true }).click()
      ]);

      // Перевіряємо що ми на дашборді
      await expect(page.locator('h2')).toContainText('Вітаємо');
    });

    // ========== КРОК 2: Вихід ==========
    await test.step('Вихід з системи', async () => {
      // Знаходимо кнопку виходу (має текст "Вийти")
      await page.getByRole('button', { name: /вийти/i }).click();

      // Очікуємо редірект на сторінку логіну
      await page.waitForURL('/login', { timeout: 5000 });

      // Перевіряємо що ми на сторінці логіну (має текст "Увійдіть до вашого акаунту")
      await expect(page.locator('text=Увійдіть до вашого акаунту')).toBeVisible();
    });

    // ========== КРОК 3: Логін ==========
    await test.step('Вхід в систему з існуючими даними', async () => {
      // Заповнюємо форму логіну через placeholder
      await page.getByPlaceholder('your@email.com').fill(testUser.email);
      await page.locator('input[type="password"]').fill(testUser.password);

      // Натискаємо кнопку входу
      await page.getByRole('button', { name: 'Увійти', exact: true }).click();

      // Очікуємо редірект на дашборд
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Перевіряємо що ми знову на дашборді
      await expect(page.locator('h2')).toContainText('Вітаємо');

      // Перевіряємо що відображається ім'я користувача
      await expect(page.locator('body')).toContainText(testUser.username);
    });
  });

  test.skip('помилка при невірному паролі', async ({ page }) => {
    // Створюємо користувача для цього тесту
    const testUser2 = {
      username: `testuser${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    await test.step('Реєстрація тестового користувача', async () => {
      await page.goto('/register');
      await page.getByPlaceholder('Ваше ім\'я').fill(testUser2.username);
      await page.getByPlaceholder('your@email.com').fill(testUser2.email);
      await page.locator('input[type="password"]').first().fill(testUser2.password);
      await page.locator('input[type="password"]').nth(1).fill(testUser2.password);
      await page.getByRole('button', { name: 'Зареєструватися', exact: true }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Вийти
      await page.getByRole('button', { name: /вийти/i }).click();
      await page.waitForURL('/login', { timeout: 5000 });
    });

    await test.step('Спроба логіну з невірним паролем', async () => {
      // Заповнюємо форму через placeholder
      await page.getByPlaceholder('your@email.com').fill(testUser2.email);
      await page.locator('input[type="password"]').fill('WrongPassword123!');

      await page.getByRole('button', { name: 'Увійти', exact: true }).click();

      // Очікуємо повідомлення про помилку (червоний блок з текстом)
      const errorMessage = page.locator('.bg-red-50, .text-red-600, [class*="error"]').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
  });
});
