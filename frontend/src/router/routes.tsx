import { createHashRouter } from 'react-router-dom';
// Deploy trigger

import { Main } from '../components/Main';
import { Login } from '../pages/Login';

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
    element: <Main />,
  },
  {
    path: '/validar-parqueo',
    element: <Main />,
  },
]);