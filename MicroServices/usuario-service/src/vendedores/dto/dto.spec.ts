import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { VendedorEstado } from '@agua/contracts';
import { ListVendedoresDto } from './list-vendedores.dto';
import { UpdateVendedorDto } from './update-vendedor.dto';
import { ChangeEstadoDto } from './change-estado.dto';
import { UpdateVendedorProfileDto } from './update-vendedor-profile.dto';

// ─── ListVendedoresDto ───

describe('ListVendedoresDto', () => {
  it('usa valores por defecto cuando se pasa objeto vacío', async () => {
    const dto = plainToInstance(ListVendedoresDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('acepta valores válidos de page y limit', async () => {
    const dto = plainToInstance(ListVendedoresDto, {
      page: 2,
      limit: 25,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('acepta filtro estado válido', async () => {
    const dto = plainToInstance(ListVendedoresDto, {
      estado: 'activo',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.estado).toBe(VendedorEstado.ACTIVO);
  });

  it('acepta filtro search', async () => {
    const dto = plainToInstance(ListVendedoresDto, {
      search: 'Acme',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('Acme');
  });

  it('rechaza page como string no numérico', async () => {
    const dto = plainToInstance(ListVendedoresDto, { page: 'abc' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('page');
  });

  it('rechaza estado que no pertenece al enum', async () => {
    const dto = plainToInstance(ListVendedoresDto, {
      estado: 'inexistente',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('estado');
  });
});

// ─── UpdateVendedorDto ───

describe('UpdateVendedorDto', () => {
  it('acepta objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateVendedorDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta todos los campos válidos', async () => {
    const dto = plainToInstance(UpdateVendedorDto, {
      empresa: 'Nueva SA',
      telefono: '11-5555-0100',
      logo: 'https://img.com/logo.png',
      ciudadDefault: 'CABA',
      zonaEntrega: 'Palermo',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.empresa).toBe('Nueva SA');
    expect(dto.telefono).toBe('11-5555-0100');
    expect(dto.logo).toBe('https://img.com/logo.png');
    expect(dto.ciudadDefault).toBe('CABA');
    expect(dto.zonaEntrega).toBe('Palermo');
  });

  it('acepta actualización parcial (solo telefono)', async () => {
    const dto = plainToInstance(UpdateVendedorDto, {
      telefono: '11-5555-0199',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.telefono).toBe('11-5555-0199');
    expect(dto.empresa).toBeUndefined();
  });
});

// ─── ChangeEstadoDto ───

describe('ChangeEstadoDto', () => {
  it('acepta estado válido sin motivo', async () => {
    const dto = plainToInstance(ChangeEstadoDto, { estado: 'activo' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.estado).toBe(VendedorEstado.ACTIVO);
  });

  it('acepta estado válido con motivo', async () => {
    const dto = plainToInstance(ChangeEstadoDto, {
      estado: 'bloqueado',
      motivo: 'Incumplimiento de términos',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.estado).toBe(VendedorEstado.BLOQUEADO);
    expect(dto.motivo).toBe('Incumplimiento de términos');
  });

  it('rechaza si falta estado (required)', async () => {
    const dto = plainToInstance(ChangeEstadoDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('estado');
  });

  it('rechaza estado con valor inválido', async () => {
    const dto = plainToInstance(ChangeEstadoDto, {
      estado: 'inexistente',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── UpdateVendedorProfileDto ───

describe('UpdateVendedorProfileDto', () => {
  it('acepta objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateVendedorProfileDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta todos los campos válidos', async () => {
    const dto = plainToInstance(UpdateVendedorProfileDto, {
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '11-5555-0100',
      empresa: 'Mi Empresa',
      logo: 'https://img.com/logo.png',
      ciudadDefault: 'Córdoba',
      zonaEntrega: 'Nueva Córdoba',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Juan');
    expect(dto.apellido).toBe('Pérez');
    expect(dto.telefono).toBe('11-5555-0100');
    expect(dto.empresa).toBe('Mi Empresa');
    expect(dto.logo).toBe('https://img.com/logo.png');
    expect(dto.ciudadDefault).toBe('Córdoba');
    expect(dto.zonaEntrega).toBe('Nueva Córdoba');
  });

  it('acepta actualización parcial (solo nombre)', async () => {
    const dto = plainToInstance(UpdateVendedorProfileDto, {
      nombre: 'Carlos',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Carlos');
    expect(dto.apellido).toBeUndefined();
  });
});
