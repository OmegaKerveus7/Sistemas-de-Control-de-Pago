import { createHashRouter } from 'react-router-dom';

import { Main } from '../components/Main';
import { Menu } from '../components/Menu';
import { Login } from '../pages/Login';
import { Registro } from '../pages/Registro';
import { ForgotPassword } from '../pages/ForgotPassword';
import { Dashboard } from '../pages/Dashboard';
import { Placeholder } from '../pages/Placeholder';
import { PagarParqueo, ResultadoPago } from '../pages/PagarParqueo';
import { SimuladorPago } from '../pages/PagarParqueo/Simulador';
import { Guardian } from '../pages/Guardian';
import { HistorialPagos } from '../pages/HistorialPagos';
import { Usuarios } from '../pages/Usuarios';
import { BuscarVehiculo } from '../pages/BuscarVehiculo';
import { Parqueo } from '../pages/Parqueo';
import { Pagos } from '../pages/Pagos';
import { Auditoria } from '../pages/Auditoria';
import { Tarifas } from '../pages/Tarifas';

export const router = createHashRouter([
  {
    path: '/',
    element: <Main />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/registro',
    element: <Registro />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/pagar-parqueo',
    element: <PagarParqueo />,
  },
  {
    path: '/pagar-parqueo/simulador',
    element: <SimuladorPago />,
  },
  {
    path: '/pagar-parqueo/resultado',
    element: <ResultadoPago />,
  },
  {
    path: '/app',
    element: <Menu />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'usuarios', element: <Usuarios /> },
      { path: 'parqueo', element: <Parqueo /> },
      { path: 'pagos', element: <Pagos /> },
      { path: 'tarifas', element: <Tarifas /> },
      { path: 'auditoria', element: <Auditoria /> },
      { path: 'validar', element: <Placeholder titulo="Validar Parqueo" /> },
      { path: 'historial', element: <HistorialPagos /> },
      { path: 'guardian', element: <Guardian /> },
      { path: 'buscar-vehiculo', element: <BuscarVehiculo /> },
      { path: 'reportes', element: <Placeholder titulo="Reportes" /> },
      { path: 'pagar', element: <PagarParqueo /> },
    ],
  },
]);
