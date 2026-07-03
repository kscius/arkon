import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('Demo login flows by role', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('estatal login reaches dashboard with estatal navigation', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('heading', { name: 'Bandeja de Acciones' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Municipios' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Asistente IA' })).toHaveCount(0);
  });

  test('municipal login reaches municipal dashboard', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: /Dashboard Municipal/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('link', { name: 'Mi Municipio' })).toBeVisible();
  });

  test('contratista login reaches contractor panel', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.getByRole('link', { name: 'Mi Empresa' }).click();
    await expect(page.getByRole('heading', { name: /Panel del Contratista/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('link', { name: 'Mis Acciones' })).toBeVisible();
  });
});
