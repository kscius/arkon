import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('RBAC route guards', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('municipal cannot open admin usuarios', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await page.goto('/#/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Bandeja de Acciones' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('contratista cannot open admin nor asistente', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.goto('/#/admin/usuarios');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });

    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Bandeja de Acciones' })).toBeVisible();
  });

  test('contratista cannot open municipios catalog', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.goto('/#/municipios');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
  });

  test('estatal cannot open asistente (hidden from nav)', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('link', { name: 'Asistente IA' })).toHaveCount(0);
    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
  });

  test('municipal cannot open asistente (hidden from nav)', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await expect(page.getByRole('link', { name: 'Asistente IA' })).toHaveCount(0);
    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
  });
});
