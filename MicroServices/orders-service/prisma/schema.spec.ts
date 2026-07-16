import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('orders Prisma schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

  it('maps the per-vendor order counter model to PEDIDO_COUNTER', () => {
    expect(schema).toContain('model OrderCounter');
    expect(schema).toContain('@@map("PEDIDO_COUNTER")');
  });

  it('keeps the counter scoped by vendedor_id with timestamps', () => {
    expect(schema).toContain('vendedor_id   String   @id @db.Uuid');
    expect(schema).toContain('current_value Int      @default(0)');
    expect(schema).toContain('created_at    DateTime @default(now())');
    expect(schema).toContain('updated_at    DateTime @updatedAt');
  });

  it('supports a database-backed active cart uniqueness invariant per cliente', () => {
    expect(schema).toContain('active_cart_key  String?   @unique @db.Uuid');
  });

  it('persists cart item product name snapshots for order checkout', () => {
    expect(schema).toContain('nombre         String   @db.VarChar(255)');
  });
});
