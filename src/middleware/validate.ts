import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

export const validate =
  (schema: AnyZodObject, target: Target = 'body') =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req[target] = await schema.parseAsync(req[target]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        res.status(422).json({ success: false, message });
        return;
      }
      next(err);
    }
  };