import { HTTP_STATUS } from './constants';

/**
 * JSON response helpers for API routes
 */
export const jsonResponse = {
  ok: (data: unknown, status = HTTP_STATUS.OK) => {
    return Response.json(data, { status });
  },

  error: (message: string, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
    return Response.json({ error: message }, { status });
  },

  unauthorized: (message = 'Unauthorized') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.UNAUTHORIZED });
  },

  badRequest: (message = 'Bad request') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.BAD_REQUEST });
  },

  notFound: (message = 'Not found') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.NOT_FOUND });
  },
};
