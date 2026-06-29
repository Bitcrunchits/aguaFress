import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateSuperAdminProfileDto } from './update-super-admin.dto';

describe('UpdateSuperAdminProfileDto', () => {
  it('acepta objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta nombre y apellido válidos', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      nombre: 'Admin',
      apellido: 'Root',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Admin');
    expect(dto.apellido).toBe('Root');
  });

  it('acepta actualización parcial (solo apellido)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      apellido: 'Nuevo',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.apellido).toBe('Nuevo');
    expect(dto.nombre).toBeUndefined();
  });

  it('rechaza nombre con tipo incorrecto (number)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      nombre: 12345,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('nombre');
  });

  it('rechaza apellido con tipo incorrecto (number)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      apellido: 12345,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('apellido');
  });

  it('rechaza nombre con menos de 2 caracteres (@MinLength)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      nombre: 'A',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('nombre');
  });

  it('rechaza nombre con más de 100 caracteres (@MaxLength)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      nombre: 'A'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('nombre');
  });

  it('rechaza apellido con más de 100 caracteres (@MaxLength)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      apellido: 'A'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('apellido');
  });

  it('acepta nombre con exactamente 100 caracteres (límite)', async () => {
    const dto = plainToInstance(UpdateSuperAdminProfileDto, {
      nombre: 'A'.repeat(100),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
