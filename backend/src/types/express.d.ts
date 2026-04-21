// Express Request extension — provides authenticated user context to route handlers
declare namespace Express {
  interface Request {
    velarisUser?: { userId: string; email: string };
  }
}
