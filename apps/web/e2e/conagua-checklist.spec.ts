import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, skipIfApiDown } from './helpers';

test.describe('CONAGUA checklist (browser registry)', () => {
  test.beforeEach(async ({ request }) => {
    await skipIfApiDown(request);
  });

  test('COPY-01 dashboard KPIs use Spanish accents', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByText('Inversión Autorizada')).toBeVisible();
    await expect(page.getByText('Obras en Ejecución')).toBeVisible();
    await expect(page.getByText('Avance Físico Prom.')).toBeVisible();
  });

  test('SHELL-05 desktop layout shows sidebar without hamburger menu', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('link', { name: 'Solicitudes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Abrir menú de navegación/i })).toBeHidden();
  });

  test('DASH-04 export actions are available', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('button', { name: /Obras \(CSV\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resumen KPIs/i })).toBeVisible();
  });

  test('IMP-04 plantilla CSV download button', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Importar PROAGUA' }).click();
    const downloadBtn = page.getByRole('button', { name: /Descargar plantilla CSV/i });
    await expect(downloadBtn).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/plantilla.*\.csv/i);
  });

  test('IMP-01 IMP-02 import controls present', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.goto('/#/proagua/import');
    await expect(page.locator('input[type="file"][accept*="csv"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Importar JSON/i })).toBeVisible();
  });

  test('CIE-02 XXII download button has accessible label', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Cierre ejercicio/i }).click();
    const xxiiBtn = page.getByRole('button', { name: /Descargar Anexo XXII/i }).first();
    await expect(xxiiBtn).toBeVisible();
  });

  test('OBR-03 truncated cells expose tooltip title', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Obras' }).click();
    const cellWithTitle = page.locator('main tbody [title]').first();
    await expect(cellWithTitle).toBeVisible();
    const title = await cellWithTitle.getAttribute('title');
    expect(title?.length).toBeGreaterThan(3);
  });

  test('FLOW-01 solicitud status columns visible', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    await expect(page.getByText('Borrador')).toBeVisible();
    await expect(page.getByText('Aprobada')).toBeVisible();
    await expect(page.locator('main tbody tr').first()).toBeVisible();
  });

  test('SOL-03 reject opens confirmation dialog', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    const rechazar = page.getByRole('button', { name: 'Rechazar' }).first();
    if (await rechazar.isVisible()) {
      await rechazar.click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await page.getByRole('button', { name: /Cancelar/i }).click();
    }
  });

  test('ALT-02 atender dialog opens and can cancel without mutation', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Alertas/i }).first().click();
    const atender = page.getByRole('button', { name: 'Atender' }).first();
    await expect(atender).toBeVisible();
    await atender.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('USR-03 delete user shows confirmation', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Usuarios' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).first().click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/Eliminar usuario/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('USR-03 deactivate user shows confirmation', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Usuarios' }).click();
    await page.getByRole('button', { name: 'Desactivar' }).first().click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/Desactivar usuario/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('ASST-02 assistant accepts query and responds', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Asistente/i }).click();
    await expect(page.getByText(/Asistente CONAGUA/i).first()).toBeVisible();
    const textarea = page.locator('textarea').first();
    await textarea.fill('¿Cuántas obras hay en el sistema?');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.locator('main').getByText(/obra|obras|22/i).last()).toBeVisible({
      timeout: 30_000,
    });
  });
});
