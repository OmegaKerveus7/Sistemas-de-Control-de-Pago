import { useCallback, useState } from 'react';
import { cerrarSesion as cerrarSesionService, obtenerUsuario } from '../services/auth.service';
import type { Usuario } from '../models';

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => obtenerUsuario());

  const cerrarSesion = useCallback(() => {
    cerrarSesionService();
    setUsuario(null);
  }, []);

  return {
    usuario,
    estaAutenticado: !!usuario,
    cerrarSesion,
  };
}