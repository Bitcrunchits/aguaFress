import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserRole } from '@agua/contracts';
import { ROLE_HOME_PATHS } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Administración',
  [UserRole.VENDEDOR]: 'Vendedor',
  [UserRole.CLIENTE]: 'Cliente',
};

@Component({
  selector: 'app-shell',
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly homePaths = ROLE_HOME_PATHS;
  readonly roleLabels = ROLE_LABELS;
  readonly clienteRole = UserRole.CLIENTE;

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.auth.sessionReady$.pipe(takeUntilDestroyed(destroyRef)).subscribe((ready) => {
      const role = ready ? this.auth.currentSession?.user.role : null;
      if (!role) return;

      const currentPath = this.router.url.split(/[?#]/, 1)[0];
      const homePath = this.homePaths[role];
      // Only correct a shell route from another role. Initial login navigation
      // is handled by the existing guest guard and must not be interrupted.
      if (Object.values(this.homePaths).some((path) => currentPath === path || currentPath.startsWith(`${path}/`)) &&
        currentPath !== homePath && !currentPath.startsWith(`${homePath}/`)) {
        void this.router.navigateByUrl(homePath, { replaceUrl: true });
      }
    });
  }

  isCurrentRoleRoute(role: UserRole): boolean {
    const homePath = this.homePaths[role];
    const currentPath = this.router.url.split(/[?#]/, 1)[0];
    return currentPath === homePath || currentPath.startsWith(`${homePath}/`);
  }

  logout(): void {
    this.auth.logout();
  }
}
