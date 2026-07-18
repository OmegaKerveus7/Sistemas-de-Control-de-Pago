import { createBrowserRouter } from 'react-router-dom';
import { Main } from '../components/Main';
import { Login } from '../pages/Login';

export const router = createBrowserRouter([
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