import { DeliveryEstado } from '@agua/contracts';
import { $Enums } from '../generated/prisma';
import { toDeliveryResponse, toPrismaDeliveryEstado, toContractDeliveryEstado } from './delivery.mapper';
import type { DeliveryRecord } from './deliveries.repository';

describe('DeliveryMapper', () => {
  describe('toDeliveryResponse', () => {
    it('mapea un DeliveryRecord completo a respuesta', () => {
      const record: DeliveryRecord = {
        id: 'entrega-1',
        orderId: 'order-1',
        vendedorId: 'vendedor-1',
        clienteId: 'cli-1',
        estado: 'pendiente' as $Enums.DeliveryEstado,
        clienteNombre: 'Juan Pérez',
        clienteTelefono: '555-1234',
        direccionCalle: 'Calle Falsa',
        direccionNumero: '1234',
        direccionPiso: '3B',
        direccionReferencia: 'Junto al kiosco',
        direccionBarrio: 'Centro',
        direccionCiudad: 'Ciudad',
        direccionProvincia: 'Provincia',
        direccionCp: '5000',
        latitud: -31.4167,
        longitud: -64.1833,
        fechaAsignacion: new Date('2026-07-07T10:00:00Z'),
        fechaEntrega: new Date('2026-07-07T14:00:00Z'),
        notas: 'Dejar en portería',
      };

      const result = toDeliveryResponse(record);

      expect(result.id).toBe('entrega-1');
      expect(result.orderId).toBe('order-1');
      expect(result.vendedorId).toBe('vendedor-1');
      expect(result.clienteId).toBe('cli-1');
      expect(result.estado).toBe(DeliveryEstado.PENDIENTE);
      expect(result.cliente).toEqual({
        nombre: 'Juan Pérez',
        telefono: '555-1234',
      });
      expect(result.direccion).toEqual({
        calle: 'Calle Falsa',
        numero: '1234',
        pisoDepto: '3B',
        referencia: 'Junto al kiosco',
        barrio: 'Centro',
        ciudad: 'Ciudad',
        provincia: 'Provincia',
        codigoPostal: '5000',
        latitude: -31.4167,
        longitude: -64.1833,
      });
      expect(result.fechaAsignacion).toBe('2026-07-07T10:00:00.000Z');
      expect(result.fechaEntrega).toBe('2026-07-07T14:00:00.000Z');
      expect(result.notas).toBe('Dejar en portería');
    });

    it('mapea campos nulos a undefined', () => {
      const record: DeliveryRecord = {
        id: 'entrega-2',
        orderId: 'order-2',
        vendedorId: 'vendedor-1',
        clienteId: 'cli-2',
        estado: 'entregada' as $Enums.DeliveryEstado,
        clienteNombre: 'María',
        clienteTelefono: null,
        direccionCalle: 'Av. Siempreviva',
        direccionNumero: '742',
        direccionPiso: null,
        direccionReferencia: null,
        direccionBarrio: null,
        direccionCiudad: 'Ciudad',
        direccionProvincia: 'Provincia',
        direccionCp: null,
        latitud: null,
        longitud: null,
        fechaAsignacion: new Date('2026-07-07'),
        fechaEntrega: null,
        notas: null,
      };

      const result = toDeliveryResponse(record);

      expect(result.estado).toBe(DeliveryEstado.ENTREGADA);
      expect(result.cliente.telefono).toBeUndefined();
      expect(result.direccion.pisoDepto).toBeUndefined();
      expect(result.direccion.referencia).toBeUndefined();
      expect(result.direccion.barrio).toBeUndefined();
      expect(result.direccion.codigoPostal).toBeUndefined();
      expect(result.direccion.latitude).toBeUndefined();
      expect(result.direccion.longitude).toBeUndefined();
      expect(result.fechaEntrega).toBeUndefined();
      expect(result.notas).toBeUndefined();
    });
  });

  describe('toPrismaDeliveryEstado', () => {
    it('convierte DeliveryEstado.PENDIENTE a prisma pendiente', () => {
      expect(toPrismaDeliveryEstado(DeliveryEstado.PENDIENTE)).toBe($Enums.DeliveryEstado.pendiente);
    });

    it('convierte DeliveryEstado.EN_CAMINO a prisma en_camino', () => {
      expect(toPrismaDeliveryEstado(DeliveryEstado.EN_CAMINO)).toBe($Enums.DeliveryEstado.en_camino);
    });

    it('convierte DeliveryEstado.ENTREGADA a prisma entregada', () => {
      expect(toPrismaDeliveryEstado(DeliveryEstado.ENTREGADA)).toBe($Enums.DeliveryEstado.entregada);
    });
  });

  describe('toContractDeliveryEstado', () => {
    it('convierte prisma pendiente a DeliveryEstado.PENDIENTE', () => {
      expect(toContractDeliveryEstado($Enums.DeliveryEstado.pendiente)).toBe(DeliveryEstado.PENDIENTE);
    });

    it('convierte prisma en_camino a DeliveryEstado.EN_CAMINO', () => {
      expect(toContractDeliveryEstado($Enums.DeliveryEstado.en_camino)).toBe(DeliveryEstado.EN_CAMINO);
    });

    it('convierte prisma entregada a DeliveryEstado.ENTREGADA', () => {
      expect(toContractDeliveryEstado($Enums.DeliveryEstado.entregada)).toBe(DeliveryEstado.ENTREGADA);
    });
  });
});
