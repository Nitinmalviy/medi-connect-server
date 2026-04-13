import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const ok = <T>(res: Response, data: T, message = 'Success'): Response =>
  res.status(200).json({ success: true, message, data } satisfies ApiResponse<T>);

export const created = <T>(res: Response, data: T, message = 'Created'): Response =>
  res.status(201).json({ success: true, message, data } satisfies ApiResponse<T>);

export const paginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Success'
): Response => res.status(200).json({ success: true, message, data, meta });

export const buildMeta = (page: number, limit: number, total: number): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
};