import { expect, test } from '@playwright/test';
import { DEMO_ASSISTANT_LABEL, DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('RBAC route guards', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('municipal cannot open admin usuarios', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await page.goto('/#/admin/usuarios');
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /Dashboard Municipal/i })).toBeVisible();
  });

  test('contratista cannot open admin nor asistente', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.goto('/#/admin/usuarios');
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 10_000 });

    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /Panel del Contratista/i })).toBeVisible();
  });

  test('contratista cannot open municipios catalog', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.goto('/#/municipios');
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 10_000 });
  });

  test('municipal can open asistente', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await page.getByRole('link', { name: 'Asistente IA' }).click();
    await expect(page).toHaveURL(/#\/asistente/, { timeout: 10_000 });
    await expect(page.getByText(DEMO_ASSISTANT_LABEL)).toBeVisible();
  });
});
