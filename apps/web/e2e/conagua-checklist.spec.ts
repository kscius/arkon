import { expect, test } from '@playwright/test';
import { DEMO_USERS, ensureBorradorSolicitud, ensurePendingAlerta, goToProaguaImport, login, skipIfApiDown } from './helpers';

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
    await goToProaguaImport(page);
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

  test('SOL-01 solicitud status columns visible', async ({ page, request }) => {
    await ensureBorradorSolicitud(request);
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    await expect(page.locator('main tbody').getByText('Borrador').first()).toBeVisible();
    await expect(page.locator('main tbody').getByText('Aprobada').first()).toBeVisible();
    await expect(page.locator('main tbody tr').first()).toBeVisible();
  });

  test('SOL-03 reject opens confirmation dialog', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    const rechazar = page.getByRole('button', { name: 'Rechazar' }).first();
    await expect(rechazar).toBeVisible();
    await rechazar.click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /Cancelar/i }).click();
  });

  test('ALT-02 atender dialog opens and can cancel without mutation', async ({ page, request }) => {
    await ensurePendingAlerta(request);
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

  test('ASST-02 asistente hidden from navigation and route blocked', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('link', { name: /Asistente/i })).toHaveCount(0);
    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/bandeja/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Bandeja de Acciones' })).toBeVisible();
  });

  test('DASH-04: click Obras CSV and wait for download', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Obras \(CSV\)/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('DASH-04b: Resumen KPIs download', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Resumen KPIs/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/i);
  });

  test('DASH-05: first Ver alert navigates to alertas or obra', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('button', { name: /Ver todas/i }).click();
    await expect(page).toHaveURL(/#\/(alertas|acciones)/, { timeout: 15_000 });
  });

  test('OBR-05: export CSV from obras page', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Obras' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Exportar CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('FLOW-03: anexos AE-GTO-2026-001 shows JAPAMI or SIMAPAG in XIII', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Anexos XII\/XIII/i }).click();
    await page.getByText('AE-GTO-2026-001').click();
    const xiiiPanel = page.locator('main').filter({ hasText: /Anexos T[eé]cnicos \(XIII\)/i });
    await expect(xiiiPanel.getByText(/JAPAMI|SIMAPAG/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('FLOW-01: borrador solicitud presentar, revisión y aprobar', async ({ page, request }) => {
    await ensureBorradorSolicitud(request);
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    const borradorRow = page.locator('main tbody tr').filter({ hasText: 'Borrador' }).first();
    await expect(borradorRow).toBeVisible({ timeout: 15_000 });
    await borradorRow.getByRole('button', { name: 'Presentar' }).click();
    await expect(page.getByText('Solicitud actualizada')).toBeVisible({ timeout: 15_000 });

    const presentadaRow = page.locator('main tbody tr').filter({ hasText: 'Presentada' }).first();
    await presentadaRow.getByRole('button', { name: 'A revisión' }).click();
    await expect(page.getByText('Solicitud actualizada')).toBeVisible({ timeout: 15_000 });

    const revisionRow = page.locator('main tbody tr').filter({ hasText: 'En revisión' }).first();
    await revisionRow.getByRole('button', { name: 'Aprobar' }).click();
    const obraSelect = page.getByRole('dialog').locator('select');
    const options = obraSelect.locator('option');
    if ((await options.count()) > 1) {
      await obraSelect.selectOption({ index: 1 });
    }
    await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
    await expect(page.locator('[data-sonner-toast]').getByText('Solicitud aprobada')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('IMP-01: upload minimal CSV with CUA-E2E-TEST-001', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await goToProaguaImport(page);
    const csv =
      'cua,folio,nombre,programa,monto_autorizado,localidad\n' +
      'CUA-PROAGUA-2022-001,PROAGUA-2022-001,Obra E2E import CSV update,PROAGUA,1000000,Sahcabmucuy';
    await page.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'e2e-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });
    await expect(page.getByText(/Total procesadas|Importación/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('IMP-02: Importar JSON shows success toast with Importación', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await goToProaguaImport(page);
    await page.locator('textarea').fill(
      JSON.stringify([
        {
          cua: 'CUA-PROAGUA-2023-001',
          nombre: 'Obra E2E import JSON update',
          programa: 'PROAGUA',
          localidad: 'Colonia Isidro de Flores',
        },
      ]),
    );
    await page.getByRole('button', { name: /Importar JSON/i }).click();
    await expect(page.getByText(/Total procesadas|Importación/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('ALT-02: atender first alert with Prueba E2E verifies success', async ({ page, request }) => {
    await ensurePendingAlerta(request);
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Alertas/i }).first().click();
    await page.getByRole('combobox').first().selectOption('pendientes');
    const atenderButtons = page.getByRole('button', { name: 'Atender' });
    await expect(atenderButtons.first()).toBeVisible({ timeout: 15_000 });
    const countBefore = await atenderButtons.count();
    await atenderButtons.first().click();
    await page.getByPlaceholder(/acción tomada/i).fill('Prueba E2E');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Alerta atendida')).toBeVisible({ timeout: 15_000 });
    const countAfter = await page.getByRole('button', { name: 'Atender' }).count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('AUTH-02: empty login shows email required message', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('input[type="email"]').fill('');
    await page.getByRole('button', { name: /Iniciar sesi[oó]n/i }).click();
    await expect(page.getByText(/Ingrese su correo electr[oó]nico/i)).toBeVisible();
  });

  test('SHELL-05 mobile: hamburger menu visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, DEMO_USERS.estatal);
    await expect(page.getByRole('button', { name: /Abrir menú de navegación/i })).toBeVisible();
  });

  test('COPY-01 alerts: alert copy uses Spanish accents in alertas', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Alertas/i }).first().click();
    // Incluye atendidas: ALT-02 puede haber consumido pendientes en la misma suite.
    await page.getByRole('combobox').first().selectOption('todas');
    await expect(
      page.locator('main').getByText(/Validación|liberación|dispersión|ejecución|devolución/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('CIE-02: XXII download triggers file', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: /Cierre ejercicio/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Descargar Anexo XXII/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });

  test('DET-04: obra detail export IX button visible', async ({ page }) => {
    await login(page, DEMO_USERS.estatal);
    await page.getByRole('link', { name: 'Obras' }).click();
    await page.locator('main tbody tr').first().click();
    await expect(page.getByRole('button', { name: 'IX' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'XXIII' })).toBeVisible();
  });

  test('MUN-R01: municipal dashboard Guadalupe Victoria', async ({ page }) => {
    await login(page, DEMO_USERS.municipal);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: /Dashboard Municipal.*Guadalupe Victoria/i })).toBeVisible();
  });

  test('CTR-R01: contratista panel', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.getByRole('link', { name: 'Mi Empresa' }).click();
    await expect(page.getByRole('heading', { name: /Panel del Contratista/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mis Obras' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mi Empresa' })).toBeVisible();
  });

  test('CTR-R04: contratista blocked from admin and asistente', async ({ page }) => {
    await login(page, DEMO_USERS.contratista);
    await page.goto('/#/admin/usuarios');
    await expect(page).toHaveURL(/#\/bandeja/);
    await page.goto('/#/asistente');
    await expect(page).toHaveURL(/#\/bandeja/);
  });
});
