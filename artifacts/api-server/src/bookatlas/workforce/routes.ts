import type { Express, Request, Response } from 'express';
import {
  CreateWorkforceTaskBody, ReviewWorkforceTaskBody, ReviewWorkforceTaskParams,
  RunWorkforceWorkerBody, RunWorkforceWorkerParams,
} from '@workspace/api-zod';
import { WorkforceError, createWorkforceTask, getWorkforce, reviewWorkforceTask, runWorkforceWorker } from './service.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.bookatlasIdentity?.role !== 'admin') {
      res.status(req.bookatlasIdentity ? 403 : 401).json({ error: 'Administrator access is required.' });
      return;
    }
    try { await handler(req, res); }
    catch (error) {
      res.status(error instanceof WorkforceError ? error.status : 503).json({
        error: error instanceof WorkforceError
          ? error.message
          : 'Workforce operation failed safely. Private storage or provider state could not be confirmed.',
      });
    }
  };
}

export function mountWorkforce(app: Express) {
  app.get('/api/manager/workforce', guarded(async (req, res) => {
    res.json(await getWorkforce(req.bookatlasIdentity!.id));
  }));

  app.post('/api/manager/workforce/tasks', guarded(async (req, res) => {
    const parsed = CreateWorkforceTaskBody.strict().safeParse(req.body);
    if (!parsed.success) throw new WorkforceError('Invalid workforce task. Check the objective, selected roles and budget.');
    res.status(201).json(await createWorkforceTask(req.bookatlasIdentity!.id, parsed.data));
  }));

  app.post('/api/manager/workforce/tasks/:id/workers/:workerId/run', guarded(async (req, res) => {
    const params = RunWorkforceWorkerParams.safeParse(req.params);
    const body = RunWorkforceWorkerBody.safeParse(req.body);
    if (!params.success || !body.success) throw new WorkforceError('Invalid worker run request.');
    res.json(await runWorkforceWorker(
      req.bookatlasIdentity!.id, params.data.id, params.data.workerId, body.data.approveSpend,
    ));
  }));

  app.post('/api/manager/workforce/tasks/:id/review', guarded(async (req, res) => {
    const params = ReviewWorkforceTaskParams.safeParse(req.params);
    const body = ReviewWorkforceTaskBody.safeParse(req.body);
    if (!params.success || !body.success) throw new WorkforceError('Invalid workforce review request.');
    res.json(await reviewWorkforceTask(req.bookatlasIdentity!.id, params.data.id, body.data));
  }));
}
