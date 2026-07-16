import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const VendedorDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  // Datos mockeados para simular la cartera de clientes del vendedor
  const clientesMock = [
    { id: '101', nombre: 'Almacén Don Bosé', direccion: 'España 450, Cipolletti', telefono: '299-4567890' },
    { id: '102', nombre: 'Kiosco El Trébol', direccion: 'Mengelle 120, Cipolletti', telefono: '299-9876543' },
    { id: '103', nombre: 'Rotisería Sabores', direccion: 'Alem 890, Cipolletti', telefono: '299-1122334' },
  ];

  return (
    <div style={styles.container}>
      {/* HEADER DEL PANEL */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>AguaFress</h1>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>Vendedor: <strong>{user?.email}</strong></span>
            <button onClick={logout} style={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={styles.mainContent}>
        <div style={styles.welcomeSection}>
          <h2>¡Bienvenido de vuelta, {user?.name || 'Vendedor'}!</h2>
          <p>Desde este panel puedes gestionar tu cartera de clientes y registrar nuevas cuentas utilizando tu código QR único.</p>
        </div>

        <div style={styles.grid}>
          {/* SECCIÓN DEL CÓDIGO QR */}
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Mi Código QR de Registro</h3>
            <p style={styles.cardText}>
              Muestra este código QR a tus clientes para que se registren. Todas sus compras quedarán vinculadas automáticamente a tu cartera.
            </p>
            <div style={styles.qrContainer}>
              {/* Espacio temporal para el QR físico que se generará en los siguientes sprints */}
              <div style={styles.qrPlaceholder}>
                <span style={styles.qrIcon}>🔳</span>
                <span style={styles.qrText}>QR del Vendedor ID: {user?.vendedor_id || 'ID Temporal'}</span>
              </div>
            </div>
          </section>

          {/* SECCIÓN DE LA CARTERA DE CLIENTES */}
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Mi Cartera de Clientes ({clientesMock.length})</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Dirección</th>
                    <th style={styles.th}>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesMock.map((cliente) => (
                    <tr key={cliente.id} style={styles.tr}>
                      <td style={styles.td}><strong>{cliente.nombre}</strong></td>
                      <td style={styles.td}>{cliente.direccion}</td>
                      <td style={styles.td}>{cliente.telefono}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// Estilos rápidos en línea (perfectamente migratorios a Tailwind CSS más adelante)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: 'sans-serif',
  },
  header: {
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    padding: '16px 24px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: {
    color: '#2563eb',
    margin: 0,
    fontSize: '24px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#4b5563',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  welcomeSection: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardTitle: {
    margin: '0 0 12px 0',
    color: '#1f2937',
    borderBottom: '2px solid #f3f4f6',
    paddingBottom: '8px',
  },
  cardText: {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    padding: '20px',
  },
  qrPlaceholder: {
    border: '3px dashed #d1d5db',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '250px',
  },
  qrIcon: {
    fontSize: '64px',
  },
  qrText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'bold' as const,
  },
  tableContainer: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
    fontSize: '14px',
  },
  th: {
    padding: '12px 8px',
    borderBottom: '2px solid #e5e7eb',
    color: '#374151',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 8px',
    color: '#4b5563',
  },
};