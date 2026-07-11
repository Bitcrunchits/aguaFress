// ─────────────────────────────────────────────────────────────
//  E2E Tests — usuario-service (ALL modules, ALL endpoints)
//  Run: node test-e2e.mjs
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3001/api';

let SUPER_TOKEN, VEND_TOKEN, CLIENT_TOKEN;
let vendedorId, clienteId, qrCodeStr, linkToken;
let stats = { pass: 0, fail: 0 };
const SUPER_EMAIL = 'super@test.com';
const VEND_EMAIL = 'vendedor@test.com';
const CLIENT_EMAIL = 'cliente@test.com';
const PWD = 'Test1234!';

function log(ok, msg) {
  if (ok) { console.log(`  ✅ ${msg}`); stats.pass++; }
  else { console.log(`  ❌ ${msg}`); stats.fail++; }
}

async function api(method, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const res = await fetch(`${BASE}${path}`, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  // NestJS wraps in { data: {...}, timestamp, path }
  const body = data?.data !== undefined ? data.data : data;
  return { status: res.status, data: body };
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('   E2E Tests — usuario-service (todos los módulos)');
  console.log('══════════════════════════════════════════════════\n');

  // ── 1. Seed super_admin ──────────────────────────────────
  console.log('─── 1. Seed super_admin ───');
  const hash = await bcrypt.hash(PWD, 12);
  const saUser = await prisma.authUser.create({
    data: { email: SUPER_EMAIL, password: hash, role: 'super_admin' }
  });
  await prisma.superAdmin.create({
    data: { auth_user_id: saUser.id, nombre: 'Super', apellido: 'Admin' }
  });
  log(true, `Super admin created: ${saUser.email} (id: ${saUser.id.slice(0,8)}...)`);

  // ── 2. Register vendedor ─────────────────────────────────
  console.log('\n─── 2. POST /auth/register/vendedor ───');
  let r = await api('POST', '/auth/register/vendedor', {
    body: {
      email: VEND_EMAIL, password: PWD,
      nombre: 'Carlos', apellido: 'Lopez', dni: '12345678',
      telefono: '1144445555', ciudad: 'CABA'
    }
  });
  log(r.status === 201, `Register vendedor -> ${r.status}`);
  vendedorId = r.data?.vendedorId || r.data?.vendedor_id;
  log(!!vendedorId, `Vendedor ID: ${vendedorId?.slice(0,8)}...`);

  // ── 3. Login as super_admin ──────────────────────────────
  console.log('\n─── 3. POST /auth/login (super_admin) ───');
  r = await api('POST', '/auth/login', { body: { email: SUPER_EMAIL, password: PWD } });
  log(r.status === 200, `Login -> ${r.status}`);
  SUPER_TOKEN = r.data?.token;
  log(!!SUPER_TOKEN, `Super admin token: ${SUPER_TOKEN?.slice(0,20)}...`);

  // ── 4. Super admin activates vendedor ────────────────────
  console.log('\n─── 4. PATCH /vendedores/{id}/estado (activate) ───');
  r = await api('PATCH', `/vendedores/${vendedorId}/estado`, {
    headers: { Authorization: `Bearer ${SUPER_TOKEN}` },
    body: { estado: 'activo' }
  });
  log(r.status === 200, `Activate vendedor -> ${r.status}`);

  // ── 5. Login as vendedor ─────────────────────────────────
  console.log('\n─── 5. POST /auth/login (vendedor) ───');
  r = await api('POST', '/auth/login', { body: { email: VEND_EMAIL, password: PWD } });
  log(r.status === 200, `Login vendedor -> ${r.status}`);
  VEND_TOKEN = r.data?.token;
  log(!!VEND_TOKEN, `Vendedor token: ${VEND_TOKEN?.slice(0,20)}...`);

  // ── 6. GET /users/profile ────────────────────────────────
  console.log('\n─── 6. GET /users/profile ───');
  r = await api('GET', '/users/profile', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `Get profile -> ${r.status}`);
  log(r.data?.email === VEND_EMAIL, `Email matches: ${r.data?.email}`);

  // ── 7. PATCH /users/profile ──────────────────────────────
  console.log('\n─── 7. PATCH /users/profile ───');
  r = await api('PATCH', '/users/profile', {
    headers: { Authorization: `Bearer ${VEND_TOKEN}` },
    body: { nombre: 'Carlos Updated', telefono: '1144446666' }
  });
  log(r.status === 200, `Update profile -> ${r.status}`);

  // ── 8. GET /vendedores/me ────────────────────────────────
  console.log('\n─── 8. GET /vendedores/me ───');
  r = await api('GET', '/vendedores/me', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `Get vendedor profile -> ${r.status}`);
  log(r.data?.nombre === 'Carlos', `Nombre: ${r.data?.nombre}`);

  // ── 9. PATCH /vendedores/me ──────────────────────────────
  console.log('\n─── 9. PATCH /vendedores/me ───');
  r = await api('PATCH', '/vendedores/me', {
    headers: { Authorization: `Bearer ${VEND_TOKEN}` },
    body: { empresa: 'Agua Fresh SA' }
  });
  log(r.status === 200, `Update vendedor profile -> ${r.status}`);

  // ── 10. POST /qr-codes ───────────────────────────────────
  console.log('\n─── 10. POST /qr-codes ───');
  r = await api('POST', '/qr-codes', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 201, `Create QR code -> ${r.status}`);
  qrCodeStr = r.data?.qrCode;
  log(!!qrCodeStr, `QR code: ${qrCodeStr?.slice(0,15)}...`);

  // ── 11. GET /qr-codes (vendor) ───────────────────────────
  console.log('\n─── 11. GET /qr-codes ───');
  r = await api('GET', '/qr-codes', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `List QR codes -> ${r.status}`);
  const qrList = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  log(qrList.length >= 1, `QR codes count: ${qrList.length}`);

  // ── 12. POST /link-invitacion ────────────────────────────
  console.log('\n─── 12. POST /link-invitacion ───');
  r = await api('POST', '/link-invitacion', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 201, `Create invitation link -> ${r.status}`);
  linkToken = r.data?.token;
  log(!!linkToken, `Link token: ${linkToken?.slice(0,15)}...`);

  // ── 13. GET /link-invitacion (vendor) ────────────────────
  console.log('\n─── 13. GET /link-invitacion ───');
  r = await api('GET', '/link-invitacion', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `List invitation links -> ${r.status}`);

  // ── 14. Register cliente (via QR code) ───────────────────
  console.log('\n─── 14. POST /auth/register (cliente via QR) ───');
  r = await api('POST', '/auth/register', {
    body: {
      email: CLIENT_EMAIL, password: PWD,
      nombre: 'Maria', apellido: 'Garcia', dni: '87654321',
      telefono: '1155557777', tipoFactura: 'B',
      direccionCalle: 'Av Siempre Viva', direccionNumero: '123',
      direccionCiudad: 'CABA', direccionProvincia: 'CABA',
      mismaDireccionEntrega: true,
      role: 'cliente', qrToken: qrCodeStr
    }
  });
  log(r.status === 201, `Register cliente -> ${r.status}`);
  clienteId = r.data?.user?.id;
  log(!!clienteId, `Cliente ID: ${clienteId?.slice(0,8)}...`);

  // ── 15. Login as cliente ─────────────────────────────────
  console.log('\n─── 15. POST /auth/login (cliente) ───');
  r = await api('POST', '/auth/login', { body: { email: CLIENT_EMAIL, password: PWD } });
  log(r.status === 200, `Login cliente -> ${r.status}`);
  CLIENT_TOKEN = r.data?.token;
  log(!!CLIENT_TOKEN, `Cliente token: ${CLIENT_TOKEN?.slice(0,20)}...`);

  // ── 16. GET /users/profile (cliente) ─────────────────────
  console.log('\n─── 16. GET /users/profile (cliente) ───');
  r = await api('GET', '/users/profile', { headers: { Authorization: `Bearer ${CLIENT_TOKEN}` } });
  log(r.status === 200, `Get cliente profile -> ${r.status}`);

  // ── 17. POST /auth/refresh ───────────────────────────────
  console.log('\n─── 17. POST /auth/refresh ───');
  r = await api('POST', '/auth/login', { body: { email: VEND_EMAIL, password: PWD } });
  const refreshTokenVend = r.data?.refreshToken;
  r = await api('POST', '/auth/refresh', { body: { refreshToken: refreshTokenVend } });
  log(r.status === 200, `Refresh token -> ${r.status}`);
  log(!!r.data?.token, 'New access token obtained');

  // ── 18. POST /auth/validate ──────────────────────────────
  console.log('\n─── 18. POST /auth/validate ───');
  r = await api('POST', '/auth/validate', { body: { token: refreshTokenVend } });
  log(r.status === 200, `Validate refresh token -> ${r.status}`);

  // ── 19. POST /auth/logout ────────────────────────────────
  console.log('\n─── 19. POST /auth/logout ───');
  r = await api('POST', '/auth/logout', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 201, `Logout -> ${r.status}`);

  // Refresh token after logout should fail
  r = await api('POST', '/auth/refresh', { body: { refreshToken: refreshTokenVend } });
  log(r.status === 401, `Refresh after logout -> ${r.status} (expected 401)`);

  // Login again for remaining tests
  r = await api('POST', '/auth/login', { body: { email: VEND_EMAIL, password: PWD } });
  VEND_TOKEN = r.data?.token;
  log(!!VEND_TOKEN, 'Re-login OK');

  // ─────────────────────────────────────────────────────────
  //  ADMIN ENDPOINTS (SUPER_ADMIN)
  // ─────────────────────────────────────────────────────────
  console.log('\n══════════ ADMIN ENDPOINTS (SUPER_ADMIN) ══════════');

  // ── 20. GET /vendedores (admin list) ─────────────────────
  console.log('\n─── 20. GET /vendedores ───');
  r = await api('GET', '/vendedores', { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `List vendedores -> ${r.status}`);
  const vendedores = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  log(vendedores.length >= 1, `Vendedores count: ${vendedores.length}`);

  // ── 21. GET /vendedores/:id ──────────────────────────────
  console.log('\n─── 21. GET /vendedores/:id ───');
  r = await api('GET', `/vendedores/${vendedorId}`, { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Get vendedor by ID -> ${r.status}`);
  log(r.data?.nombre === 'Carlos', `Nombre: ${r.data?.nombre}`);

  // ── 22. PATCH /vendedores/:id ───────────────────────────
  console.log('\n─── 22. PATCH /vendedores/:id ───');
  r = await api('PATCH', `/vendedores/${vendedorId}`, {
    headers: { Authorization: `Bearer ${SUPER_TOKEN}` },
    body: { empresa: 'Agua Fresh SA - Updated' }
  });
  log(r.status === 200, `Update vendedor -> ${r.status}`);

  // ── 23. GET /clientes (admin list) ───────────────────────
  console.log('\n─── 23. GET /clientes ───');
  r = await api('GET', '/clientes', { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `List clientes -> ${r.status}`);
  const clientes = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  log(clientes.length >= 1, `Clientes count: ${clientes.length}`);

  // ── 24. GET /clientes/:id ────────────────────────────────
  console.log('\n─── 24. GET /clientes/:id ───');
  r = await api('GET', `/clientes/${clienteId}`, { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Get cliente by ID -> ${r.status}`);

  // ── 25. PATCH /clientes/:id ──────────────────────────────
  console.log('\n─── 25. PATCH /clientes/:id ───');
  r = await api('PATCH', `/clientes/${clienteId}`, {
    headers: { Authorization: `Bearer ${SUPER_TOKEN}` },
    body: { telefono: '1199998888' }
  });
  log(r.status === 200, `Update cliente -> ${r.status}`);

  // ── 26. PATCH /clientes/:id/reassign ─────────────────────
  console.log('\n─── 26. PATCH /clientes/:id/reassign (bad vendedor) ───');
  r = await api('PATCH', `/clientes/${clienteId}/reassign`, {
    headers: { Authorization: `Bearer ${SUPER_TOKEN}` },
    body: { vendedorId: '00000000-0000-0000-0000-000000000000' }
  });
  log(r.status === 404 || r.status === 400, `Reassign -> ${r.status} (expected 4xx)`);

  // ── 27. GET /clientes/mios (vendor own) ──────────────────
  console.log('\n─── 27. GET /clientes/mios ───');
  r = await api('GET', '/clientes/mios', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `List my clientes -> ${r.status}`);
  const misClientes = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  log(misClientes.length >= 1, `My clientes count: ${misClientes.length}`);

  // ── 28. GET /clientes/mios/:id ──────────────────────────
  console.log('\n─── 28. GET /clientes/mios/:id ───');
  r = await api('GET', `/clientes/mios/${clienteId}`, { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  log(r.status === 200, `Get my cliente -> ${r.status}`);

  // ── 29. PATCH /clientes/mios/:id ────────────────────────
  console.log('\n─── 29. PATCH /clientes/mios/:id ───');
  r = await api('PATCH', `/clientes/mios/${clienteId}`, {
    headers: { Authorization: `Bearer ${VEND_TOKEN}` },
    body: { telefono: '1188887777' }
  });
  log(r.status === 200, `Update my cliente -> ${r.status}`);

  // ── 30. GET /super-admin/me ──────────────────────────────
  console.log('\n─── 30. GET /super-admin/me ───');
  r = await api('GET', '/super-admin/me', { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Get super admin -> ${r.status}`);

  // ── 31. PATCH /super-admin/me ────────────────────────────
  console.log('\n─── 31. PATCH /super-admin/me ───');
  r = await api('PATCH', '/super-admin/me', {
    headers: { Authorization: `Bearer ${SUPER_TOKEN}` },
    body: { nombre: 'Super Updated' }
  });
  log(r.status === 200, `Update super admin -> ${r.status}`);

  // ── 32. GET /super-admin/dashboard ───────────────────────
  console.log('\n─── 32. GET /super-admin/dashboard ───');
  r = await api('GET', '/super-admin/dashboard', { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Get dashboard -> ${r.status}`);
  log(r.data?.totalVendedores >= 1, `Total vendedores: ${r.data?.totalVendedores}`);
  log(r.data?.totalClientes >= 1, `Total clientes: ${r.data?.totalClientes}`);

  // ── 33. GET /admin/qr-codes ──────────────────────────────
  console.log('\n─── 33. GET /admin/qr-codes ───');
  r = await api('GET', `/admin/qr-codes?vendedorId=${vendedorId}`, { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Admin list QR -> ${r.status}`);

  // ── 34. GET /admin/link-invitacion ───────────────────────
  console.log('\n─── 34. GET /admin/link-invitacion ───');
  r = await api('GET', `/admin/link-invitacion?vendedorId=${vendedorId}`, { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Admin list links -> ${r.status}`);

  // ── 35. GET /admin/audit-logs ────────────────────────────
  console.log('\n─── 35. GET /admin/audit-logs ───');
  r = await api('GET', '/admin/audit-logs', { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `List audit logs -> ${r.status}`);
  const logs = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  log(logs.length >= 1, `Audit logs count: ${logs.length}`);

  // ── 36. Auth test: cliente on admin endpoint ────────────
  console.log('\n─── 36. GET /vendedores (cliente token -> 403 expected) ───');
  r = await api('GET', '/vendedores', { headers: { Authorization: `Bearer ${CLIENT_TOKEN}` } });
  log(r.status === 403, `Cliente on admin endpoint -> ${r.status} (expected 403)`);

  // ── 37. Deactivate QR code (vendor) ──────────────────────
  console.log('\n─── 37. PATCH /qr-codes/:id/deactivate (vendor) ───');
  r = await api('GET', '/qr-codes', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  const qrList2 = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  const qrId = qrList2[0]?.id;
  if (qrId) {
    r = await api('PATCH', `/qr-codes/${qrId}/deactivate`, { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
    log(r.status === 200, `Deactivate QR -> ${r.status}`);
  } else log(false, 'No QR code ID to deactivate');

  // ── 38. Deactivate invitation link (vendor) ──────────────
  console.log('\n─── 38. PATCH /link-invitacion/:id/deactivate (vendor) ───');
  r = await api('GET', '/link-invitacion', { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
  const linkList = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
  const linkId = linkList[0]?.id;
  if (linkId) {
    r = await api('PATCH', `/link-invitacion/${linkId}/deactivate`, { headers: { Authorization: `Bearer ${VEND_TOKEN}` } });
    log(r.status === 200, `Deactivate link -> ${r.status}`);
  } else log(false, 'No link ID to deactivate');

  // ── 39. Verify vendedor estado ────────────────────────────
  console.log('\n─── 39. GET /vendedores/:id (verify estado) ───');
  r = await api('GET', `/vendedores/${vendedorId}`, { headers: { Authorization: `Bearer ${SUPER_TOKEN}` } });
  log(r.status === 200, `Get vendedor estado -> ${r.status}`);
  log(r.data?.estado === 'activo', `Estado: ${r.data?.estado}`);

  // ─────────────────────────────────────────────────────────
  //  SUMMARY
  // ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`   RESULTADOS: ${stats.pass} ✅  |  ${stats.fail} ❌`);
  console.log(`   TOTAL: ${stats.pass + stats.fail} tests`);
  console.log('══════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(stats.fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
