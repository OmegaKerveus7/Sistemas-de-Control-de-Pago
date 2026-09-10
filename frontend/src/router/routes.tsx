import { createHashRouter } from 'react-router-dom';

import { Main } from '../components/Main';
import { Menu } from '../components/Menu';
import { Login } from '../pages/Login';
import { Registro } from '../pages/Registro';
import { ForgotPassword } from '../pages/ForgotPassword';
import { Dashboard } from '../pages/Dashboard';
import { Placeholder } from '../pages/Placeholder';
import { PagarParqueo, ResultadoPago } from '../pages/PagarParqueo';
import { Guardian } from '../pages/Guardian';
import { HistorialPagos } from '../pages/HistorialPagos';

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
    path: '/pagar-parqueo/resultado',
    element: <ResultadoPago />,
  },
  {
    path: '/app',
    element: <Menu />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'usuarios', element: <Placeholder titulo="Usuarios" /> },
      { path: 'parqueo', element: <Placeholder titulo="Parqueo" /> },
      { path: 'pagos', element: <Placeholder titulo="Pagos" /> },
      { path: 'tarifas', element: <Placeholder titulo="Tarifas" /> },
      { path: 'auditoria', element: <Placeholder titulo="Auditoría" /> },
      { path: 'validar', element: <Placeholder titulo="Validar Parqueo" /> },
      { path: 'historial', element: <HistorialPagos /> },
      { path: 'guardian', element: <Guardian /> },
      { path: 'reportes', element: <Placeholder titulo="Reportes" /> },
      { path: 'pagar', element: <PagarParqueo /> },
    ],
  },
]);
