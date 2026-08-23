import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import { useAuth } from '../../auth/hooks/useAuth';

export default function PerfilPage() {
  const { user } = useAuth();

  if (!user) {
    return <EmptyState message="No hay perfil autenticado para mostrar" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Perfil</h1>
        <p className="text-sm text-text-secondary">Información real de la sesión autenticada.</p>
      </div>
      <Card>
        <Card.Body className="space-y-3">
          <p><span className="font-medium text-text-primary">Nombre:</span> {user.nombre ?? 'Sin nombre'}</p>
          <p><span className="font-medium text-text-primary">Email:</span> {user.email}</p>
          <p><span className="font-medium text-text-primary">Rol:</span> {user.role}</p>
        </Card.Body>
      </Card>
    </div>
  );
}
