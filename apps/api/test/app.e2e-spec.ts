import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Sigopem2024!';
const skipE2e = !process.env.DATABASE_URL || process.env.SKIP_E2E === '1';

async function login(
  app: INestApplication,
  email: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect((res: Response) => {
      if (res.status !== 200 && res.status !== 201) {
        throw new Error(`login failed: ${res.status}`);
      }
    });
  return res.body.access_token as string;
}

describe('SIGOPEM API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (skipE2e) return;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('health check', async () => {
    if (skipE2e) return;
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('login returns token for estatal, municipal and contratista roles', async () => {
    if (skipE2e) return;
    for (const email of [
      'estatal@sigopem.gob.mx',
      'puebla@sigopem.gob.mx',
      'cce@sigopem.gob.mx',
    ]) {
      const token = await login(app, email);
      expect(token).toBeTruthy();
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.email).toBe(email);
    }
  });

  it('GET /obras is scoped by role', async () => {
    if (skipE2e) return;
    const estatalToken = await login(app, 'estatal@sigopem.gob.mx');
    const municipalToken = await login(app, 'puebla@sigopem.gob.mx');
    const estatal = await request(app.getHttpServer())
      .get('/api/obras')
      .set('Authorization', `Bearer ${estatalToken}`)
      .expect(200);
    const municipal = await request(app.getHttpServer())
      .get('/api/obras')
      .set('Authorization', `Bearer ${municipalToken}`)
      .expect(200);
    expect(Array.isArray(estatal.body)).toBe(true);
    expect(Array.isArray(municipal.body)).toBe(true);
    expect(municipal.body.length).toBeLessThanOrEqual(estatal.body.length);
    expect(municipal.body.length).toBeGreaterThan(0);
  });

  it('contratista can POST avance and municipal can PATCH validate', async () => {
    if (skipE2e) return;
    const contratistaToken = await login(app, 'cce@sigopem.gob.mx');
    const municipalToken = await login(app, 'puebla@sigopem.gob.mx');
    const obrasRes = await request(app.getHttpServer())
      .get('/api/obras')
      .set('Authorization', `Bearer ${contratistaToken}`)
      .expect(200);
    const obraId = obrasRes.body[0]?.id;
    expect(obraId).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post(`/api/avances/obra/${obraId}`)
      .set('Authorization', `Bearer ${contratistaToken}`)
      .send({
        periodo: 'E2E Test 2099',
        programado: 50,
        reportado: 48,
        variacion: -2,
        estatus: 'en_revision',
      })
      .expect((res: Response) => {
        if (res.status !== 200 && res.status !== 201) throw new Error(`create avance: ${res.status}`);
      });

    const avanceId = created.body.id as string;
    const validated = await request(app.getHttpServer())
      .patch(`/api/avances/${avanceId}`)
      .set('Authorization', `Bearer ${municipalToken}`)
      .send({ validado: 48, comentarios: 'Validado e2e' })
      .expect(200);
    expect(validated.body.estatus).toBe('validado');
  });

  it('dual estimacion validation municipal then estatal', async () => {
    if (skipE2e) return;
    const municipalToken = await login(app, 'puebla@sigopem.gob.mx');
    const estatalToken = await login(app, 'estatal@sigopem.gob.mx');
    const obrasRes = await request(app.getHttpServer())
      .get('/api/obras')
      .set('Authorization', `Bearer ${municipalToken}`)
      .expect(200);
    const obraId = obrasRes.body[0]?.id;
    expect(obraId).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post(`/api/estimaciones/obra/${obraId}`)
      .set('Authorization', `Bearer ${municipalToken}`)
      .send({
        numero: 99,
        periodo: 'E2E 2099',
        monto_estimado: 100000,
        monto_acumulado: 100000,
        porcentaje_financiero: 5,
        fecha_presentacion: '2099-01-01',
      })
      .expect((res: Response) => {
        if (res.status !== 200 && res.status !== 201) throw new Error(`create estimacion: ${res.status}`);
      });

    const estId = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/estimaciones/${estId}/validate?nivel=municipal&aprobar=true`)
      .set('Authorization', `Bearer ${municipalToken}`)
      .expect(200);

    const authorized = await request(app.getHttpServer())
      .patch(`/api/estimaciones/${estId}/validate?nivel=estatal&aprobar=true`)
      .set('Authorization', `Bearer ${estatalToken}`)
      .expect(200);
    expect(authorized.body.validacion_estatal).toBe(true);
    expect(authorized.body.estatus).toBe('autorizada');
  });

  it('public register always creates contratista and rejects unknown fields', async () => {
    if (skipE2e) return;
    const email = `e2e-register-${Date.now()}@sigopem.test`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password: PASSWORD,
        fullName: 'E2E Register',
        role: 'estatal',
      })
      .expect(400);

    expect(res.body.message).toBeDefined();

    const created = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password: PASSWORD,
        fullName: 'E2E Register',
      })
      .expect((r: Response) => {
        if (r.status !== 200 && r.status !== 201) throw new Error(`register: ${r.status}`);
      });

    expect(created.body.user.role).toBe('contratista');
  });

  it('chat requires JWT and responds', async () => {
    if (skipE2e) return;
    await request(app.getHttpServer())
      .post('/api/chat/ask')
      .send({ message: 'hola' })
      .expect(401);

    const token = await login(app, 'estatal@sigopem.gob.mx');
    const res = await request(app.getHttpServer())
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'resumen ejecutivo' })
      .expect((res: Response) => {
        if (res.status !== 200 && res.status !== 201) throw new Error(`chat: ${res.status}`);
      });
    expect(res.body.response ?? res.body.answer ?? res.body.message).toBeTruthy();
  });
});
