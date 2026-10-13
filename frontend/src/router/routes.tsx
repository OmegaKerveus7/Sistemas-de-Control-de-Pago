import { createHashRouter } from 'react-router-dom';

import { Main } from '../components/Main';
import { Menu } from '../components/Menu';
import { Login } from '../pages/Login';
import { Registro } from '../pages/Registro';
import { ForgotPassword } from '../pages/ForgotPassword';
import { Dashboard } from '../pages/Dashboard';
import { PagarParqueo, ResultadoPago } from '../pages/PagarParqueo';
import { PagoPublico, ResultadoPagoPublico } from '../pages/PagoPublico';
import { SimuladorPago } from '../pages/PagarParqueo/Simulador';
import { Guardian } from '../pages/Guardian';
import { HistorialPagos } from '../pages/HistorialPagos';
import { RegistrarVehiculo } from '../pages/RegistrarVehiculo';
import { ValidarParqueo } from '../pages/ValidarParqueo';
import { ValidarParqueoPublico } from '../pages/ValidarParqueoPublico';
import { Usuarios } from '../pages/Usuarios';
import { BuscarVehiculo } from '../pages/BuscarVehiculo';
import { Parqueo } from '../pages/Parqueo';
import { Pagos } from '../pages/Pagos';
import { Reportes } from '../pages/Reportes';
import { Tarifas } from '../pages/Tarifas';
import { QrPago } from '../pages/QrPago';

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
    element: <PagoPublico />,
  },
  {
    path: '/validar-parqueo',
    element: <ValidarParqueoPublico />,
  },
  {
    path: '/pagar-parqueo/simulador',
    element: <SimuladorPago />,
  },
  {
    path: '/pagar-parqueo/resultado',
    element: <ResultadoPagoPublico />,
  },
  {
    path: '/app',
    element: <Menu />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'usuarios', element: <Usuarios /> },
      { path: 'parqueo', element: <Parqueo /> },
      { path: 'pagos', element: <Pagos /> },
      { path: 'pagos/tarjeta', element: <PagarParqueo /> },
      { path: 'pagos/tarjeta/resultado', element: <ResultadoPago /> },
      { path: 'pagar/resultado', element: <ResultadoPago /> },
      { path: 'tarifas', element: <Tarifas /> },
      { path: 'reportes', element: <Reportes /> },
      { path: 'validar', element: <ValidarParqueo /> },
      { path: 'historial', element: <HistorialPagos /> },
      { path: 'mis-vehiculos', element: <RegistrarVehiculo /> },
      { path: 'guardian', element: <Guardian /> },
      { path: 'qr-pago', element: <QrPago /> },
      { path: 'buscar-vehiculo', element: <BuscarVehiculo /> },
      { path: 'pagar', element: <PagarParqueo /> },
    ],
  },
]);
