import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { appointmentRouter } from '../modules/appointments/appointment.routes';
import { patientRouter } from '../modules/patients/patient.routes';
import { userRouter } from '../modules/users/user.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'clinicos-api',
    timestamp: new Date().toISOString()
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/patients', patientRouter);
apiRouter.use('/appointments', appointmentRouter);
apiRouter.use('/users', userRouter);