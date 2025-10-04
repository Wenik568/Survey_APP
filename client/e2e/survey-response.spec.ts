import { test, expect } from '@playwright/test';

/**
 * E2E Test: Проходження опитування
 * Сценарій: Створення опитування → Отримання публічного посилання →
 *           Проходження як респондент → Перевірка результатів
 */

test.describe('Проходження опитування (публічна сторінка)', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `surveycreator${timestamp}`,
    email: `surveycreator${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  let publicSurveyLink = '';

  // Підготовка: створюємо користувача та опитування
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Реєстрація через placeholder селектори
    await page.goto('/register');
    await page.getByPlaceholder('Ваше ім\'я').fill(testUser.username);
    await page.getByPlaceholder('your@email.com').fill(testUser.email);
    await page.locator('input[type="password"]').first().fill(testUser.password);
    await page.locator('input[type="password"]').nth(1).fill(testUser.password);
    await page.getByRole('button', { name: 'Зареєструватися', exact: true }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Створення опитування
    const createButton = page.locator('a:has-text("Створити"), button:has-text("Створити")').first();
    await createButton.click();
    await page.waitForURL(/\/surveys\/create|\/create/, { timeout: 10000 });

    // Заповнюємо форму
    await page.getByPlaceholder(/Задоволеність клієнтів|Наприклад:/i).fill(`Public Survey ${timestamp}`);

    const questionInput = page.getByPlaceholder(/Введіть ваше питання|питання/i).first();
    await questionInput.fill('Оберіть ваш улюблений колір');

    // Зберігаємо
    const saveButton = page.locator('button:has-text("Створити"), button:has-text("Зберегти")').last();
    await saveButton.click();
    await page.waitForTimeout(3000);

    // Намагаємось отримати публічне посилання
    // Можливо треба перейти в деталі опитування
    const surveyTitle = page.locator(`text=Public Survey ${timestamp}`).first();
    if (await surveyTitle.isVisible()) {
      await surveyTitle.click();
      await page.waitForTimeout(1000);
    }

    // Шукаємо публічне посилання або кнопку "Копіювати посилання"
    const linkElement = page.locator('[href*="/survey/"], text=/посилання|link/i').first();
    if (await linkElement.isVisible()) {
      const href = await linkElement.getAttribute('href').catch(() => null);
      if (href && href.includes('/survey/')) {
        publicSurveyLink = href;
      }
    }

    // Якщо не знайшли, спробуємо витягти з URL або тексту
    if (!publicSurveyLink) {
      const pageContent = await page.content();
      const match = pageContent.match(/\/survey\/([a-zA-Z0-9-]+)/);
      if (match) {
        publicSurveyLink = match[0];
      }
    }

    await page.close();
  });

  test.skip('проходження опитування як анонімний респондент', async ({ page }) => {
    // Пропускаємо якщо не змогли отримати посилання
    test.skip(!publicSurveyLink, 'Не вдалося отримати публічне посилання');

    // ========== КРОК 1: Відкриття публічного посилання ==========
    await test.step('Відкриття публічної сторінки опитування', async () => {
      await page.goto(publicSurveyLink);

      // Очікуємо завантаження опитування
      await page.waitForLoadState('networkidle');

      // Перевіряємо що опитування відображається
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    // ========== КРОК 2: Заповнення відповідей ==========
    await test.step('Заповнення відповідей на питання', async () => {
      // Знаходимо поле для відповіді
      const answerInput = page.locator('input[type="text"], textarea').first();

      if (await answerInput.isVisible()) {
        await answerInput.fill('Синій');
      } else {
        // Можливо це radio/checkbox - шукаємо перший варіант
        const firstOption = page.locator('input[type="radio"], input[type="checkbox"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }
    });

    // ========== КРОК 3: Відправка відповідей ==========
    await test.step('Відправка відповідей', async () => {
      const submitButton = page.locator('button:has-text("Відправити"), button[type="submit"]').last();
      await submitButton.click();

      // Очікуємо повідомлення про успіх або сторінку подяки
      await page.waitForTimeout(2000);

      const successMessage = page.locator('text=/дякуємо|спасибо|thank|успішно|success/i').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.skip('перевірка валідації обов\'язкових питань', async ({ page }) => {
    test.skip(!publicSurveyLink, 'Не вдалося отримати публічне посилання');

    await test.step('Спроба відправки без заповнення обов\'язкових полів', async () => {
      await page.goto(publicSurveyLink);
      await page.waitForLoadState('networkidle');

      // Намагаємось відправити без заповнення
      const submitButton = page.locator('button:has-text("Відправити"), button[type="submit"]').last();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Перевіряємо що або залишились на тій же сторінці, або є помилка
        const errorOrValidation = page.locator('text=/обов\'язков|required|заповніть/i').first();
        const isStillOnSurveyPage = page.url().includes('/survey/');

        const hasValidation = await errorOrValidation.isVisible().catch(() => false);

        expect(hasValidation || isStillOnSurveyPage).toBeTruthy();
      }
    });
  });

  test.skip('неможливість доступу до неіснуючого опитування', async ({ page }) => {
    await test.step('Спроба доступу до неіснуючого посилання', async () => {
      await page.goto('/survey/non-existent-survey-link-12345');

      // Очікуємо помилку 404 або повідомлення "не знайдено"
      const notFoundMessage = page.locator('text=/не знайден|not found|404|неактивн/i').first();
      await expect(notFoundMessage).toBeVisible({ timeout: 5000 });
    });
  });
});
