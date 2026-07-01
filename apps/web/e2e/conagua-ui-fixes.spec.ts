import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('CONAGUA UI fixes (review 2026-06)', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('login works with prefilled demo credentials in one click', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('input[type="password"]')).not.toHaveValue('');
    await page.getByRole('button', { name: /Iniciar sesi[oó]n/i }).click();
    await page.waitForURL(/#\/dashboard/, { timeout: 30_000 });
  });

  test('top bar shows route title on solicitudes', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    await expect(page.getByText('Solicitudes de Programa', { exact: false }).first()).toBeVisible();
  });

  test('notification bell navigates to alertas', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await Promise.all([
      page.waitForURL(/#\/alertas/, { timeout: 15_000 }),
      page.getByRole('button', { name: /centro de alertas/i }).click(),
    ]);
    // TopBar title updates immediately; page h1 waits on API data
    await expect(page.locator('header').getByText('Centro de Alertas')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('invalid obra id shows friendly error without server 500', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.goto('/#/acciones/1');
    await expect(page.getByText(/Identificador de (acci[oó]n|obra) no válido/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Internal server error/i)).not.toBeVisible();
  });

  test('estatal visits CONAGUA PROAGUA sidebar sections', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    for (const label of [
      'Solicitudes',
      'Anexos XII/XIII',
      'Cierre ejercicio',
      'Importar PROAGUA',
    ]) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page.locator('main')).not.toBeEmpty();
    }
  });
});
