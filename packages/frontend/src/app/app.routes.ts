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
        loadComponent: () =>
          import('./features/admin/admin-page/admin-page').then((module) => module.AdminPage),
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
        loadComponent: () =>
          import('./features/cliente/cliente-page/cliente-page').then(
            (module) => module.ClientePage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
