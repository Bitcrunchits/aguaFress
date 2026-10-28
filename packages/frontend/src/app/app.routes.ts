import { Routes } from '@angular/router';
import { UserRole } from '@agua/contracts';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell').then((module) => module.AppShell),
    children: [
      {
        path: 'admin',
        canActivate: [roleGuard(UserRole.SUPER_ADMIN)],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/admin-page/admin-page').then(
                (module) => module.AdminPage,
              ),
          },
          {
            path: 'vendedores',
            loadComponent: () =>
              import('./features/admin/vendedores-list-page/vendedores-list-page').then(
                (module) => module.VendedoresListPage,
              ),
          },
        ],
      },
      {
        path: 'vendedor',
        canActivate: [roleGuard(UserRole.VENDEDOR)],
        loadComponent: () =>
          import('./features/vendedor/vendedor-page/vendedor-page').then(
            (module) => module.VendedorPage,
          ),
      },
      {
        path: 'cliente',
        canActivate: [roleGuard(UserRole.CLIENTE)],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/cliente/cliente-page/cliente-page').then(
                (module) => module.ClientePage,
              ),
          },
          {
            path: 'catalogo',
            loadComponent: () =>
              import(
                './features/cliente/cliente-catalogo-page/cliente-catalogo-page'
              ).then((module) => module.ClienteCatalogoPage),
          },
          {
            path: 'carrito',
            loadComponent: () =>
              import(
                './features/cliente/cliente-carrito-page/cliente-carrito-page'
              ).then((module) => module.ClienteCarritoPage),
          },
          {
            path: 'pedidos',
            loadComponent: () =>
              import(
                './features/cliente/cliente-pedidos-page/cliente-pedidos-page'
              ).then((module) => module.ClientePedidosPage),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
