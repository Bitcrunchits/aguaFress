/**
 * Converts camelCase to snake_case.
 * "tipoFactura" → "tipo_factura", "direccionCp" → "direccion_cp"
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z\d])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Removes undefined values from an object and maps camelCase keys
 * to snake_case using automatic conversion.
 *
 * @param dto - The input DTO (partial update payload)
 * @param fieldMap - Optional explicit mapping for keys that don't follow camelCase→snake_case
 * @returns A clean object safe to pass as Prisma update data
 *
 * @example
 * ```ts
 * const data = cleanUpdateInput(dto);
 * // { nombre: 'foo', direccion_calle: 'Av Siempre Viva' }
 * ```
 */
export function cleanUpdateInput<T extends object>(
  dto: T,
  fieldMap: Partial<Record<keyof T, string>> = {},
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dto as Record<string, unknown>)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [fieldMap[k as keyof T] ?? camelToSnake(k), v]),
  );
}
