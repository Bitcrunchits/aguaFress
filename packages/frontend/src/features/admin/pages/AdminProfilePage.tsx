import { FormEvent, useEffect, useState } from 'react';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { useAdminProfile } from '../hooks/useAdminProfile';

export default function AdminProfilePage() {
  const { profile, isLoading, isError, isMutating, isSuccess, errorMessage, refetch, updateProfile } = useAdminProfile();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setApellido(profile.apellido ?? '');
    }
  }, [profile]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();

    if (!trimmedNombre) {
      setValidationError('El nombre es obligatorio');
      return;
    }

    setValidationError('');
    updateProfile({ nombre: trimmedNombre, apellido: trimmedApellido || undefined });
  };

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Perfil admin</h1>
        <p className="text-sm text-text-secondary">Actualizá solo datos de perfil; la identidad viene del JWT.</p>
      </div>

      <Card>
        <Card.Body className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Email</p>
            <p className="text-text-primary">{profile?.email ?? 'No informado'}</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text-primary">Nombre</span>
              <input
                aria-label="Nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text-primary">Apellido</span>
              <input
                aria-label="Apellido"
                value={apellido}
                onChange={(event) => setApellido(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            {validationError && <p className="text-sm text-error">{validationError}</p>}
            {!isError && errorMessage && <p className="text-sm text-error">{errorMessage}</p>}
            {isSuccess && <p className="text-sm text-success">Perfil actualizado correctamente</p>}
            <Button type="submit" disabled={isMutating}>Guardar perfil</Button>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
