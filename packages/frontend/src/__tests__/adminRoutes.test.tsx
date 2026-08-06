import { describe, expect, it } from 'vitest';
import { UserRole } from '@agua/contracts';
import routes, { type RouteConfig } from '../config/routes';

function findRoute(path: string, candidates: RouteConfig[] = routes): RouteConfig | undefined {
  for (const route of candidates) {
    if (route.path === path) return route;
    const child = route.children ? findRoute(path, route.children) : undefined;
    if (child) return child;
  }
  return undefined;
}

describe('admin routes', () => {
  it('keeps every admin route behind the SUPER_ADMIN ProtectedRoute', () => {
    const adminRoute = findRoute('/admin');

    expect(adminRoute?.allowedRoles).toEqual([UserRole.SUPER_ADMIN]);
    expect(adminRoute?.children?.[0]?.children?.map((route) => route.path ?? 'index')).toEqual([
      'index',
      'vendors',
      'vendors/pending',
      'vendors/:vendedorId',
      'clients',
      'clients/:clienteId',
      'audit',
      'audit/:auditId',
      'qr-codes',
      'invitation-links',
      'profile',
    ]);
  });
});
