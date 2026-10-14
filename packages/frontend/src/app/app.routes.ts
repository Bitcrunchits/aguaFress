import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell/app-shell').then((module) => module.AppShell),
    children: [
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin-page/admin-page').then((module) => module.AdminPage),
      },
      {
        path: 'vendedor',
        loadComponent: () =>
          import('./features/vendedor/vendedor-page/vendedor-page').then(
            (module) => module.VendedorPage,
          ),
      },
      {
        path: 'cliente',
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
