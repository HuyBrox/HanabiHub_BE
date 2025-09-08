import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';

const router: Router = Router();

// Basic route
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Hanabi Backend API v1.0',
    data: {
      status: 'OK',
      version: '1.0.0',
      endpoints: [
        'GET /api/v1/',
        'GET /health'
      ]
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
});

export default router;
