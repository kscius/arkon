import { type APIRequestContext, type Page, test } from '@playwright/test';

export const DEMO_PASSWORD = 'Arkon2024!';

export const DEMO_USERS = {
  estatal: 'estatal@arkon.gob.mx',
  municipal: 'municipal.centro@arkon.gob.mx',
  contratista: 'cce@arkon.gob.mx',
} as const;

/** Skip tests when API health is not available (stack not started or not seeded). */
export async function skipIfApiDown(request: APIRequestContext): Promise<void> {
  try {
    const res = await request.get('/api/health', { timeout: 5_000 });
    if (!res.ok()) {
      test.skip(true, `API health returned ${res.status()}`);
    }
    const body = await res.json();
    if (body?.status !== 'ok') {
      test.skip(true, 'API health body unexpected');
    }
  } catch {
    test.skip(true, 'API not reachable — start docker compose or dev:api + dev:web');
  }
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/#/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /Iniciar Sesion/i }).click();
  await page.waitForURL(/#\/dashboard/, { timeout: 30_000 });
}
