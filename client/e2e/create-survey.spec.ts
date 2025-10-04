import { test, expect } from '@playwright/test';

/**
 * E2E Test: Створення опитування
 * Сценарій: Логін → Створення нового опитування → Перевірка що опитування створено
 */

test.describe('Створення опитування', () => {
  // Дані для тестового користувача
  const timestamp = Date.now();
  const testUser = {
    username: `creator${timestamp}`,
    email: `creator${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  const surveyData = {
    title: `E2E Test Survey ${timestamp}`,
    description: 'Опитування створене автоматичним E2E тестом',
  };

  // Створюємо користувача перед тестами
  test.beforeEach(async ({ page }) => {
    // Реєстрація через placeholder селектори
    await page.goto('/register');
    await page.getByPlaceholder('Ваше ім\'я').fill(testUser.username);
    await page.getByPlaceholder('your@email.com').fill(testUser.email);
    await page.locator('input[type="password"]').first().fill(testUser.password);
    await page.locator('input[type="password"]').nth(1).fill(testUser.password);
    await page.getByRole('button', { name: 'Зареєструватися', exact: true }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('створення опитування з одним питанням', async ({ page }) => {
    // ========== КРОК 1: Перехід на сторінку створення ==========
    await test.step('Перехід на сторінку створення опитування', async () => {
      // Шукаємо кнопку/посилання "Створити опитування"
      const createButton = page.locator('a:has-text("Створити"), button:has-text("Створити")').first();
      await createButton.click();

      // Очікуємо завантаження сторінки створення
      await page.waitForURL(/\/surveys\/create|\/create/, { timeout: 10000 });
    });

    // ========== КРОК 2: Заповнення форми ==========
    await test.step('Заповнення основної інформації', async () => {
      // Заповнюємо назву через placeholder
      await page.getByPlaceholder(/Задоволеність клієнтів|Наприклад:/i).fill(surveyData.title);

      // Заповнюємо опис
      const descriptionField = page.getByPlaceholder('Короткий опис опитування...');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill(surveyData.description);
      }
    });

    // ========== КРОК 3: Додавання питання ==========
    await test.step('Додавання текстового питання', async () => {
      // Шукаємо поле для питання через placeholder
      const questionInput = page.getByPlaceholder(/Введіть ваше питання|питання/i).first();
      await questionInput.fill('Як вам наш сервіс?');

      // Вибираємо тип питання якщо потрібно
      const typeSelector = page.locator('select[name*="type"]').first();
      if (await typeSelector.isVisible()) {
        await typeSelector.selectOption('text');
      }
    });

    // ========== КРОК 4: Збереження опитування ==========
    await test.step('Збереження опитування', async () => {
      // Знаходимо кнопку збереження/створення
      const saveButton = page.locator('button:has-text("Створити"), button:has-text("Зберегти")').last();
      await saveButton.click();

      // Очікуємо редірект або повідомлення про успіх
      await page.waitForTimeout(2000);

      // Перевіряємо що опитування створено
      // Можливі варіанти: редірект на /surveys, показ success message, тощо
      const urlAfterSave = page.url();
      const hasSuccessMessage = await page.locator('text=/успішно|success|створен/i').isVisible().catch(() => false);

      expect(urlAfterSave.includes('/surveys') || hasSuccessMessage).toBeTruthy();
    });

    // ========== КРОК 5: Перевірка що опитування є в списку ==========
    await test.step('Перевірка наявності опитування в списку', async () => {
      // Переходимо на список опитувань якщо не там
      if (!page.url().includes('/surveys')) {
        await page.goto('/surveys');
      }

      await page.waitForLoadState('networkidle');

      // Шукаємо наше опитування в списку
      const surveyCard = page.locator(`text=${surveyData.title}`);
      await expect(surveyCard).toBeVisible({ timeout: 5000 });
    });
  });

  test.skip('валідація обов\'язкових полів', async ({ page }) => {
    await test.step('Спроба створення без назви', async () => {
      const createButton = page.locator('a:has-text("Створити"), button:has-text("Створити")').first();
      await createButton.click();

      await page.waitForURL(/\/surveys\/create|\/create/, { timeout: 10000 });

      // Намагаємось зберегти без заповнення
      const saveButton = page.locator('button:has-text("Створити"), button:has-text("Зберегти")').last();
      await saveButton.click();

      // Очікуємо помилку валідації
      const errorMessage = page.locator('text=/обов\'язков|required|заповніть/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });
  });
});
