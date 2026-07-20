import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DeliveryEstado } from '@agua/contracts';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  delivery: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const entregaBase = {
  id: 'entrega-1',
  order_id: 'order-1',
  vendedor_id: 'vendedor-1',
  estado: DeliveryEstado.PENDIENTE,
  cliente_nombre: 'Juan Pérez',
  cliente_telefono: null,
  direccion_calle: 'Calle Falsa',
  direccion_numero: '1234',
  direccion_piso: null,
  direccion_referencia: null,
  direccion_barrio: null,
  direccion_ciudad: null,
  direccion_provincia: null,
  direccion_cp: null,
  latitud: null,
  longitud: null,
  fecha_asignacion: new Date('2026-07-07'),
  fecha_entrega: null,
  notas: null,
};

describe('DeliveriesService', () => {
  let service: DeliveriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  //  findOne

  describe('findOne', () => {
    it('devuelve la entrega si pertenece al vendedor', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(entregaBase);

      const result = await service.findOne('entrega-1', 'vendedor-1');

      expect(result.id).toBe('entrega-1');
      expect(result.vendedorId).toBe('vendedor-1');
    });

    it('lanza NotFoundException si la entrega no existe', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.findOne('fake-id', 'vendedor-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la entrega pertenece a otro vendedor', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(entregaBase);

      await expect(service.findOne('entrega-1', 'otro-vendedor')).rejects.toThrow(ForbiddenException);
    });
  });

  //  updateStatus — transiciones válidas

  describe('updateStatus — transiciones válidas', () => {
    it('PENDIENTE → EN_CAMINO es válida', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(entregaBase);
      mockPrisma.delivery.update.mockResolvedValue({
        ...entregaBase,
        estado: DeliveryEstado.EN_CAMINO,
      });

      const result = await service.updateStatus('entrega-1', { estado: DeliveryEstado.EN_CAMINO }, 'vendedor-1');

      expect(mockPrisma.delivery.update).toHaveBeenCalled();
      expect(result.estado).toBe(DeliveryEstado.EN_CAMINO);
    });

    it('EN_CAMINO → ENTREGADA es válida', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...entregaBase,
        estado: DeliveryEstado.EN_CAMINO,
      });
      mockPrisma.delivery.update.mockResolvedValue({
        ...entregaBase,
        estado: DeliveryEstado.ENTREGADA,
        fecha_entrega: new Date(),
      });

      const result = await service.updateStatus('entrega-1', { estado: DeliveryEstado.ENTREGADA }, 'vendedor-1');

      expect(result.estado).toBe(DeliveryEstado.ENTREGADA);
    });
  });


  //  updateStatus — transiciones inválidas

  describe('updateStatus — transiciones inválidas', () => {
    it('PENDIENTE → ENTREGADA lanza 400', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(entregaBase);

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.ENTREGADA }, 'vendedor-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
    });

    it('ENTREGADA → EN_CAMINO lanza 400', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...entregaBase,
        estado: DeliveryEstado.ENTREGADA,
      });

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.EN_CAMINO }, 'vendedor-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si la entrega no existe', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('fake-id', { estado: DeliveryEstado.EN_CAMINO }, 'vendedor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la entrega pertenece a otro vendedor', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(entregaBase);

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.EN_CAMINO }, 'otro-vendedor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});