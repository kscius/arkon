import { type APIRequestContext, type Page, test } from '@playwright/test';

const tenantId =
  process.env.TENANT_ID?.trim().toLowerCase() === 'conagua' ? 'conagua' : 'arkon';
const emailDomain = tenantId === 'conagua' ? 'conagua.gob.mx' : 'arkon.gob.mx';

export const DEMO_PASSWORD = tenantId === 'conagua' ? 'Conagua2024!' : 'Arkon2024!';

export const DEMO_USERS = {
  estatal: `estatal@${emailDomain}`,
  municipal: `municipal.centro@${emailDomain}`,
  contratista: `cce@${emailDomain}`,
} as const;

export const DEMO_ASSISTANT_LABEL =
  tenantId === 'conagua' ? /Asistente CONAGUA/i : /Asistente ARKON/i;

function apiBase(): string {
  return (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
}

async function apiToken(request: APIRequestContext, email = DEMO_USERS.estatal): Promise<string> {
  const login = await request.post(`${apiBase()}/api/auth/login`, {
    data: { email, password: DEMO_PASSWORD },
    timeout: 15_000,
  });
  if (!login.ok()) {
    throw new Error(`API login failed: ${login.status()}`);
  }
  const body = (await login.json()) as { access_token?: string };
  if (!body.access_token) throw new Error('API login missing access_token');
  return body.access_token;
}

/** Ensures at least one borrador solicitud exists (FLOW-01 consumes the only seed borrador). */
export async function ensureBorradorSolicitud(request: APIRequestContext): Promise<void> {
  const token = await apiToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const listRes = await request.get(`${apiBase()}/api/solicitudes-programa?estatus=borrador`, {
    headers,
  });
  if (!listRes.ok()) return;
  const list = (await listRes.json()) as unknown[];
  if (Array.isArray(list) && list.length > 0) return;

  const anyRes = await request.get(`${apiBase()}/api/solicitudes-programa`, { headers });
  if (!anyRes.ok()) return;
  const existing = (await anyRes.json()) as Array<{
    entidad_id?: string;
    municipio_id?: string;
  }>;
  const ref = existing[0];
  if (!ref?.entidad_id || !ref?.municipio_id) return;

  await request.post(`${apiBase()}/api/solicitudes-programa`, {
    headers,
    data: {
      programa: 'PROAGUA',
      ejercicio_fiscal: 2026,
      entidad_id: ref.entidad_id,
      municipio_id: ref.municipio_id,
      tipo_apoyo: 'infraestructura',
      componente: 'AP',
      monto_solicitado: 1_000_000,
    },
  });
}

/** Skip tests when API is not available (stack not started or not seeded). */
export async function skipIfApiDown(request: APIRequestContext): Promise<void> {
  const base = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const apiBases = [
    base,
    process.env.PLAYWRIGHT_API_URL?.replace(/\/$/, '') ?? null,
    'http://localhost:8000',
    'http://localhost:3000',
  ].filter((url): url is string => Boolean(url));

  for (const apiBase of [...new Set(apiBases)]) {
    try {
      const health = await request.get(`${apiBase}/api/health`, { timeout: 8_000 });
      if (health.ok()) {
        const body = await health.json();
        if (body?.status === 'ok') return;
      }
    } catch {
      /* health route may be blocked by proxy — try login */
    }

    try {
      const login = await request.post(`${apiBase}/api/auth/login`, {
        data: { email: DEMO_USERS.estatal, password: DEMO_PASSWORD },
        timeout: 12_000,
      });
      if (login.ok() || login.status() === 401) return;
    } catch {
      /* try next candidate */
    }
  }

  test.skip(true, 'API not reachable — start docker compose or dev:api + dev:web');
}

export async function login(page: Page, email: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto('/#/', { waitUntil: 'domcontentloaded' });
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(1_500);
    }
  }
  if (lastError) throw lastError;
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /Iniciar sesi[oó]n/i }).click();
  await page.waitForURL(/#\/dashboard/, { timeout: 30_000 });
}

/** HashRouter does not always re-render on `page.goto('/#/…')` from an in-app route — use nav link. */
export async function goToProaguaImport(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Importar PROAGUA' }).click();
  await page.waitForURL(/#\/proagua\/import/, { timeout: 15_000 });
  await page.getByRole('heading', { name: /Importación histórica PROAGUA/i }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
}
