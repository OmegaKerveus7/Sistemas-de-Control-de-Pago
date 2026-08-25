import { Router } from 'express';
import { forgotPassword, resetPassword } from '../controllers/recuperacion.controller';

export const recuperacionRouter = Router();

recuperacionRouter.post('/forgot-password', forgotPassword);
recuperacionRouter.post('/reset-password', resetPassword);
