import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Activity logs service boundary', () => {
  it('does not introduce usuario-service AUDIT_LOG migration or Prisma coupling', () => {
    const source = listSourceFiles(join(__dirname, '..')).map((filePath) => readFileSync(filePath, 'utf8')).join('\n');

    expect(source).not.toMatch(/AUDIT_LOG|usuario-service|@prisma\/client|PrismaService/);
  });

  it('does not expose a public or gateway activity-log create action', () => {
    const actionRegistry = readFileSync(join(__dirname, '../../../gateway/src/actions/action-registry.ts'), 'utf8');

    expect(actionRegistry).not.toMatch(/activity[_-]logs\.create|activity-logs\.create|activity_logs\.create/);
    expect(actionRegistry).not.toMatch(/createActivityLog|activityLogCreate/i);
  });
});

function listSourceFiles(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const fileStat = statSync(fullPath);
    if (fileStat.isDirectory()) return listSourceFiles(fullPath);
    return fullPath.endsWith('.ts') && !fullPath.endsWith('.spec.ts') ? [fullPath] : [];
  });
}
