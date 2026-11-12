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
