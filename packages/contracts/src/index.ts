// ─── AguaFress — Paquete de Contratos Compartidos ───
// Todos los microservicios importan desde acá para garantizar
// consistencia de tipos en eventos y endpoints.
//
// USO:
//   import { LoginRequest, UserRole, OrderCreatedEvent } from '@agua/contracts';
//   import type { ProductResponse } from '@agua/contracts/dto/products';
//
// ⚠️ Los tipos con prefijo "Request" son para el BODY de endpoints REST.
//    Los tipos con prefijo "Event" son para Redis Streams.
//    Los tipos "Response" son lo que devuelve el endpoint.

export * from './enums';
export * from './events';
export * from './dto/common.dto';
export * from './dto/auth.dto';
export * from './dto/user.dto';
export * from './dto/products.dto';
export * from './dto/orders.dto';
export * from './dto/deliveries.dto';
export * from './dto/notifications.dto';
export * from './dto/super-admin.dto';
