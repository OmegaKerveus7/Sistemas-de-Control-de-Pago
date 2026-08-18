import { createHashRouter } from 'react-router-dom';

import { Main } from '../components/Main';
import { Menu } from '../components/Menu';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Placeholder } from '../pages/Placeholder';
import { PagarParqueo, ResultadoPago } from '../pages/PagarParqueo';

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
      { path: 'reportes', element: <Placeholder titulo="Reportes" /> },
      { path: 'pagar', element: <PagarParqueo /> },
    ],
  },
]);
