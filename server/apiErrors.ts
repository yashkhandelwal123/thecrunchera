import type { ErrorRequestHandler, RequestHandler } from "express";
export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "This store service is unavailable. Please refresh and try again." });
};
export const apiErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const candidate = Number(err.status || err.statusCode);
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate < 600 ? candidate : 500;
  console.error(`[api] ${req.method} ${req.path} failed (${status})`, { name: err.name, code: err.code, type: err.type });
  res.status(status).json({ error: status === 400 ? "The request could not be read. Refresh the page and try again." : "The store is temporarily unavailable. Please retry shortly." });
  // Do not throw after responding: Express may close the socket when headers have already been sent.
};
