export type TcpTransport = 'send' | 'publish';

export interface ActionMapping {
  readonly tcpPattern: string;
  readonly transport: TcpTransport;
  readonly authRequired: boolean;
  readonly roles?: readonly string[];
}

export type ServiceFamilyStatus = 'available' | 'unavailable';

export interface ServiceFamily {
  readonly status: ServiceFamilyStatus;
  readonly actions: Readonly<Record<string, ActionMapping>>;
}

/**
 * Central registry mapping /api/v1/{service}/{action} to TCP message patterns.
 *
 * - `status: 'available'` → service is live and actions can be dispatched
 * - `status: 'unavailable'` → service is planned but not deployed yet
 * - `authRequired` → gateway enforces JWT before dispatching
 * - `roles` → optional role restriction (enforced by RolesGuard)
 * - `transport: 'send'` → request/response via ClientProxy.send()
 * - `transport: 'publish'` → fire-and-forget via ClientProxy.emit()
 */
export const ACTION_REGISTRY: Readonly<Record<string, ServiceFamily>> = {
  auth: {
    status: 'available',
    actions: {
      login: { tcpPattern: 'auth.login', transport: 'send', authRequired: false },
      register: { tcpPattern: 'auth.register', transport: 'send', authRequired: false },
      refresh: { tcpPattern: 'auth.refresh', transport: 'send', authRequired: false },
      validate: { tcpPattern: 'auth.validate', transport: 'send', authRequired: false },
      logout: { tcpPattern: 'auth.logout', transport: 'send', authRequired: true },
    },
  },
  users: {
    status: 'available',
    actions: {
      profile: { tcpPattern: 'users.profile', transport: 'send', authRequired: true },
      'profile/update': { tcpPattern: 'users.profile_update', transport: 'send', authRequired: true },
    },
  },
  vendedores: {
    status: 'available',
    actions: {
      list: { tcpPattern: 'vendedores.list', transport: 'send', authRequired: true, roles: ['super_admin'] },
      profile: { tcpPattern: 'vendedores.profile', transport: 'send', authRequired: true },
      'profile/update': { tcpPattern: 'vendedores.profile_update', transport: 'send', authRequired: true },
      'get-by-id': { tcpPattern: 'vendedores.get_by_id', transport: 'send', authRequired: true, roles: ['super_admin'] },
      update: { tcpPattern: 'vendedores.update', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'change-estado': { tcpPattern: 'vendedores.change_estado', transport: 'send', authRequired: true, roles: ['super_admin'] },
    },
  },
  clientes: {
    status: 'available',
    actions: {
      list: { tcpPattern: 'clientes.list', transport: 'send', authRequired: true },
      cartera: { tcpPattern: 'clientes.cartera', transport: 'send', authRequired: true },
      'get-by-id': { tcpPattern: 'clientes.get_by_id', transport: 'send', authRequired: true, roles: ['super_admin'] },
      update: { tcpPattern: 'clientes.update', transport: 'send', authRequired: true, roles: ['super_admin'] },
      reassign: { tcpPattern: 'clientes.reassign', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'own/get-by-id': { tcpPattern: 'clientes.own_get_by_id', transport: 'send', authRequired: true, roles: ['vendedor'] },
      'own/update': { tcpPattern: 'clientes.own_update', transport: 'send', authRequired: true, roles: ['vendedor'] },
    },
  },
  'super-admin': {
    status: 'available',
    actions: {
      dashboard: { tcpPattern: 'super_admin.dashboard', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'audit-log': { tcpPattern: 'super_admin.audit_log', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'qr-codes': { tcpPattern: 'super_admin.qr_codes', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'link-invitacion': { tcpPattern: 'super_admin.link_invitacion', transport: 'send', authRequired: true, roles: ['super_admin'] },
      vendedores: { tcpPattern: 'super_admin.vendedores', transport: 'send', authRequired: true, roles: ['super_admin'] },
      profile: { tcpPattern: 'super_admin.profile', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'profile/update': { tcpPattern: 'super_admin.profile_update', transport: 'send', authRequired: true, roles: ['super_admin'] },
    },
  },
  qr: {
    status: 'available',
    actions: {
      'vendor/list': { tcpPattern: 'qr.vendor_list', transport: 'send', authRequired: true, roles: ['vendedor'] },
      'vendor/create': { tcpPattern: 'qr.vendor_create', transport: 'send', authRequired: true, roles: ['vendedor'] },
      'admin/deactivate': { tcpPattern: 'qr.admin_deactivate', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'vendor/deactivate': { tcpPattern: 'qr.vendor_deactivate', transport: 'send', authRequired: true, roles: ['vendedor'] },
    },
  },
  'link-invitacion': {
    status: 'available',
    actions: {
      'vendor/list': { tcpPattern: 'link_invitacion.vendor_list', transport: 'send', authRequired: true, roles: ['vendedor'] },
      'vendor/create': { tcpPattern: 'link_invitacion.vendor_create', transport: 'send', authRequired: true, roles: ['vendedor'] },
      'admin/deactivate': { tcpPattern: 'link_invitacion.admin_deactivate', transport: 'send', authRequired: true, roles: ['super_admin'] },
      'vendor/deactivate': { tcpPattern: 'link_invitacion.vendor_deactivate', transport: 'send', authRequired: true, roles: ['vendedor'] },
    },
  },
  // Planned service families — not deployed yet
  products: { status: 'unavailable', actions: {} },
  categories: { status: 'unavailable', actions: {} },
  brands: { status: 'unavailable', actions: {} },
  orders: {
    status: 'available',
    actions: {
      list: { tcpPattern: 'orders.list', transport: 'send', authRequired: true },
      'get-by-id': { tcpPattern: 'orders.get_by_id', transport: 'send', authRequired: true },
      create: { tcpPattern: 'orders.create', transport: 'send', authRequired: true, roles: ['cliente'] },
      'status/update': { tcpPattern: 'orders.status_update', transport: 'send', authRequired: true, roles: ['vendedor'] },
      cancel: { tcpPattern: 'orders.cancel', transport: 'send', authRequired: true, roles: ['cliente'] },
      confirm: { tcpPattern: 'orders.confirm', transport: 'send', authRequired: true, roles: ['vendedor'] },
    },
  },
  cart: {
    status: 'available',
    actions: {
      get: { tcpPattern: 'cart.get', transport: 'send', authRequired: true, roles: ['cliente'] },
      'items/add': { tcpPattern: 'cart.items_add', transport: 'send', authRequired: true, roles: ['cliente'] },
      'items/update': { tcpPattern: 'cart.items_update', transport: 'send', authRequired: true, roles: ['cliente'] },
      'items/delete': { tcpPattern: 'cart.items_delete', transport: 'send', authRequired: true, roles: ['cliente'] },
    },
  },
  deliveries: { status: 'unavailable', actions: {} },
  'activity-logs': { status: 'unavailable', actions: {} },
};
