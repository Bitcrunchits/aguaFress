import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { normalizeApiError } from '../../../shared/api-error';
import { useRegisterClientByVendor } from '../hooks/useVendedorClients';
import type { RegisterClientByVendorRequest } from '../services/clientes.service';

interface RegistrationFormState {
  nombre: string;
  apellido: string;
  email: string;
  emailConfirmation: string;
  password: string;
  telefono: string;
  dni: string;
  calleEntrega: string;
  numeroEntrega: string;
}

const INITIAL_FORM: RegistrationFormState = {
  nombre: '',
  apellido: '',
  email: '',
  emailConfirmation: '',
  password: '',
  telefono: '',
  dni: '',
  calleEntrega: '',
  numeroEntrega: '',
};

function buildRequest(form: RegistrationFormState): RegisterClientByVendorRequest {
  return {
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    email: form.email.trim(),
    emailConfirmation: form.emailConfirmation.trim(),
    password: form.password,
    telefono: form.telefono.trim(),
    dni: form.dni.trim(),
    direccionEntrega: {
      calle: form.calleEntrega.trim(),
      numero: form.numeroEntrega.trim(),
    },
  };
}

export default function VendedorClientRegistrationPage() {
  const { isRegistering, registerClient } = useRegisterClientByVendor();
  const [form, setForm] = useState<RegistrationFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof RegistrationFormState, value: string) => {
    setFormError(null);
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const request = buildRequest(form);
    const requiredValues = [
      request.nombre,
      request.apellido,
      request.email,
      request.emailConfirmation,
      request.password,
      request.telefono,
      request.dni,
      request.direccionEntrega.calle,
      request.direccionEntrega.numero,
    ];

    if (request.email !== request.emailConfirmation) {
      setFormError('Los emails no coinciden.');
      return;
    }

    if (requiredValues.some((value) => !value)) {
      setFormError('Completá todos los campos obligatorios.');
      return;
    }

    try {
      await registerClient(request);
      setSuccess(true);
      setForm(INITIAL_FORM);
    } catch (error) {
      setFormError(normalizeApiError(error, 'No se pudo registrar el cliente').message);
      setForm((currentForm) => ({ ...currentForm, password: '' }));
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Nuevo cliente</h1>
        <Card>
          <Card.Body className="space-y-4">
            <p className="text-sm text-text-primary">Cliente registrado correctamente.</p>
            <Link to="/clientes">
              <Button type="button">Volver a clientes</Button>
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Nuevo cliente</h1>
        <p className="text-sm text-text-secondary">Registrá un cliente directamente en tu cartera.</p>
      </div>

      <Card>
        <Card.Body>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Nombre</span><input aria-label="Nombre" value={form.nombre} onChange={(event) => handleChange('nombre', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Apellido</span><input aria-label="Apellido" value={form.apellido} onChange={(event) => handleChange('apellido', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Email</span><input aria-label="Email" type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Confirmar email</span><input aria-label="Confirmar email" type="email" value={form.emailConfirmation} onChange={(event) => handleChange('emailConfirmation', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Contraseña</span><input aria-label="Contraseña" type="password" value={form.password} onChange={(event) => handleChange('password', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Teléfono</span><input aria-label="Teléfono" value={form.telefono} onChange={(event) => handleChange('telefono', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">DNI</span><input aria-label="DNI" value={form.dni} onChange={(event) => handleChange('dni', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Calle de entrega</span><input aria-label="Calle de entrega" value={form.calleEntrega} onChange={(event) => handleChange('calleEntrega', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm"><span className="font-medium text-text-primary">Número de entrega</span><input aria-label="Número de entrega" value={form.numeroEntrega} onChange={(event) => handleChange('numeroEntrega', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></label>

            {formError ? <p role="alert" className="text-sm text-red-600 sm:col-span-2">{formError}</p> : null}

            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" disabled={isRegistering}>{isRegistering ? 'Registrando...' : 'Registrar cliente'}</Button>
              <Link to="/clientes"><Button type="button" variant="outline">Volver</Button></Link>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
