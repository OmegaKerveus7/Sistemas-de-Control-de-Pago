import type { Request, Response } from 'express';
import * as auditoriaService from '../services/auditoria.service';

export async function listar(_req: Request, res: Response) {
  res.json(await auditoriaService.listar());
}
