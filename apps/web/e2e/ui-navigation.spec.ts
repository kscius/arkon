import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('Full navigation smoke by role', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('estatal visits all sidebar sections and obra detail', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    for (const label of ['Dashboard', 'Municipios', 'Contratistas', 'Usuarios', 'Alertas', 'Asistente IA']) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await page.getByRole('link', { name: 'Dashboard' }).click();
    const portfolioCard = page.locator('[class*="rounded"]').filter({ hasText: 'Obras del portafolio' });
    await portfolioCard.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/#\/obras\//, { timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /Estimaciones/i })).toBeVisible();
  });

  test('municipal visits sidebar and obra from dashboard table', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    for (const label of ['Dashboard', 'Mi Municipio', 'Contratistas', 'Alertas', 'Asistente IA']) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.locator('main tbody tr').first().click();
    await expect(page).toHaveURL(/#\/obras\//, { timeout: 15_000 });
  });

  test('contratista visits sidebar and obra from mis obras', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    for (const label of ['Dashboard', 'Mis Obras', 'Alertas']) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await page.getByRole('link', { name: 'Mis Obras' }).click();
    await page.locator('main tbody tr').first().click();
    await expect(page).toHaveURL(/#\/obras\//, { timeout: 15_000 });
  });
});
