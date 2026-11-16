// ─── Super Admin ───
// Endpoints exclusivos del rol SUPER_ADMIN
// Rutas: /super-admin/*
// Acceso: solo SUPER_ADMIN (verificado por Gateway + Guard)
//
// ⚠️ El SUPER_ADMIN solo ve métricas consolidadas, NUNCA datos sensibles
//    de clientes individuales. Solo cantidades (#).

import { UserRole, VendedorEstado } from '../enums';
import type { PaginatedResponse, PaginationRequest } from './common.dto';

// ════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════

export interface SuperAdminDashboardResponse {
  totalVendedores: number;
  vendedoresActivos: number;
  vendedoresPendientes: number;
  totalClientes: number;
  clientesConVendedor: number;
  totalSuperAdmins: number;
}

// ════════════════════════════════════════════
//  LISTADO DE VENDEDORES
// ════════════════════════════════════════════

export interface SuperAdminVendedorListFilters extends PaginationRequest {
  estado?: VendedorEstado;
  search?: string;
}

export interface SuperAdminVendedorItem {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  empresa?: string;
  estado: VendedorEstado;
  /** Solo cantidad (#), sin datos sensibles de clientes */
  clientesCount: number;
  ventasMes?: number;
  fechaRegistro: string;
}

export type SuperAdminVendedorListResponse = PaginatedResponse<SuperAdminVendedorItem>;

// ════════════════════════════════════════════
//  VENDEDORES PENDIENTES
// ════════════════════════════════════════════

export interface SuperAdminPendienteItem {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  fechaSolicitud: string;
}

export type SuperAdminPendientesResponse = PaginatedResponse<SuperAdminPendienteItem>;

// ════════════════════════════════════════════
//  MÉTRICAS DE VENDEDOR ESPECÍFICO
// ════════════════════════════════════════════

export interface SuperAdminMetricasResponse {
  vendedorId: string;
  totalPedidos: number;
  clientesCount: number;
  ventasDiarias?: number;
  ventasMensuales?: number;
  ventasAnuales?: number;
  promedioTicket?: number;
}

// ════════════════════════════════════════════
//  CLIENTES DE UN VENDEDOR (solo para admin)
// ════════════════════════════════════════════

export interface SuperAdminClienteItem {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  totalPedidos?: number;
  fechaAsignacion: string;
}

export type SuperAdminClientesResponse = PaginatedResponse<SuperAdminClienteItem>;

// ════════════════════════════════════════════
//  PERFIL DEL SUPER ADMIN
// ════════════════════════════════════════════

export interface SuperAdminProfileResponse {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: UserRole;
}

export interface UpdateSuperAdminProfileRequest {
  nombre: string;
  apellido: string;
}

/**
 * Narrow response of `super-admin/profile/update`. The backend returns either
 * the raw SUPER_ADMIN row (no email/role) or a `select` projection
 * (`id`/`nombre`/`apellido`/timestamps) — never the full profile. This is a
 * NEW type (OCP): the existing `SuperAdminProfileResponse` keeps its full shape.
 */
export interface SuperAdminProfileUpdateResponse {
  id: string;
  nombre: string;
  apellido: string;
}

// ════════════════════════════════════════════
//  LISTADO DE CLIENTES (v2 — matches the real clientes.list row)
// ════════════════════════════════════════════
//
// The gateway `clientes.list` action returns raw CLIENTE rows with the vendor
// included (`vendedor { id, nombre, apellido, empresa }`) and `_count.cartera`.
// Raw rows carry NO `email` (it lives on AUTH_USER) and NO `fechaAsignacion`.
// These V2 types describe that real shape (OCP: the legacy
// `SuperAdminClienteItem` above is left untouched).

export interface SuperAdminClienteListFilters extends PaginationRequest {
  vendedorId?: string;
  search?: string;
}

export interface SuperAdminClienteVendedor {
  nombre: string;
  apellido: string;
  empresa: string | null;
}

export interface SuperAdminClienteItemV2 {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  vendedor: SuperAdminClienteVendedor;
  createdAt: string;
}

export type SuperAdminClientesResponseV2 = PaginatedResponse<SuperAdminClienteItemV2>;
