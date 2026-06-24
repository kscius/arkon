# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: conagua-checklist.spec.ts >> CONAGUA checklist (browser registry) >> SHELL-05 desktop layout shows sidebar without hamburger menu
- Location: e2e\conagua-checklist.spec.ts:16:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img "CONAGUA - Comision Nacional del Agua" [ref=e7]
      - heading "CONAGUA" [level=1] [ref=e8]
      - paragraph [ref=e9]: Comisión Nacional del Agua
      - paragraph [ref=e10]: Seguimiento y control de obras públicas del sector hídrico
    - generic [ref=e11]:
      - img [ref=e12]
      - text: Cannot POST /api/
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Correo electrónico
        - generic [ref=e17]:
          - img [ref=e18]
          - textbox "Correo electrónico" [ref=e21]:
            - /placeholder: usuario@institucion.gob.mx
            - text: estatal@conagua.gob.mx
      - generic [ref=e22]:
        - generic [ref=e23]: Contraseña
        - generic [ref=e24]:
          - img [ref=e25]
          - textbox "Contraseña" [ref=e28]:
            - /placeholder: ••••••••
            - text: Conagua2024!
      - button "Iniciar sesión" [ref=e29] [cursor=pointer]
    - paragraph [ref=e30]: "Demo: estatal@conagua.gob.mx / Conagua2024!"
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { type APIRequestContext, type Page, test } from '@playwright/test';
  2  | 
  3  | const tenantId =
  4  |   process.env.TENANT_ID?.trim().toLowerCase() === 'conagua' ? 'conagua' : 'arkon';
  5  | const emailDomain = tenantId === 'conagua' ? 'conagua.gob.mx' : 'arkon.gob.mx';
  6  | 
  7  | export const DEMO_PASSWORD = tenantId === 'conagua' ? 'Conagua2024!' : 'Arkon2024!';
  8  | 
  9  | export const DEMO_USERS = {
  10 |   estatal: `estatal@${emailDomain}`,
  11 |   municipal: `municipal.centro@${emailDomain}`,
  12 |   contratista: `cce@${emailDomain}`,
  13 | } as const;
  14 | 
  15 | export const DEMO_ASSISTANT_LABEL =
  16 |   tenantId === 'conagua' ? /Asistente CONAGUA/i : /Asistente ARKON/i;
  17 | 
  18 | /** Skip tests when API health is not available (stack not started or not seeded). */
  19 | export async function skipIfApiDown(request: APIRequestContext): Promise<void> {
  20 |   const base = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  21 |   const candidates = [
  22 |     `${base}/api/health`,
  23 |     process.env.PLAYWRIGHT_API_URL
  24 |       ? `${process.env.PLAYWRIGHT_API_URL.replace(/\/$/, '')}/api/health`
  25 |       : null,
  26 |     'http://localhost:8000/api/health',
  27 |   ].filter((url): url is string => Boolean(url));
  28 | 
  29 |   for (const url of [...new Set(candidates)]) {
  30 |     try {
  31 |       const res = await request.get(url, { timeout: 5_000 });
  32 |       if (!res.ok()) continue;
  33 |       const body = await res.json();
  34 |       if (body?.status === 'ok') return;
  35 |     } catch {
  36 |       /* try next candidate */
  37 |     }
  38 |   }
  39 | 
  40 |   test.skip(true, 'API not reachable — start docker compose or dev:api + dev:web');
  41 | }
  42 | 
  43 | export async function login(page: Page, email: string): Promise<void> {
  44 |   await page.goto('/#/');
  45 |   await page.locator('input[type="email"]').fill(email);
  46 |   await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  47 |   await page.getByRole('button', { name: /Iniciar sesi[oó]n/i }).click();
> 48 |   await page.waitForURL(/#\/dashboard/, { timeout: 30_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  49 | }
  50 | 
```