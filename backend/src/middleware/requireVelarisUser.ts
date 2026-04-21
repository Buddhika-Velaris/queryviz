import { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';

const ALLOWED_DOMAIN = '@velaris.io';

export async function requireVelarisUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    )?.emailAddress;

    if (!primaryEmail || !primaryEmail.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      res.status(403).json({
        error: 'Access restricted to velaris.io accounts',
      });
      return;
    }

    // Attach to request so route handlers can save history without re-calling Clerk
    req.velarisUser = { userId, email: primaryEmail };

    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({ error: message });
  }
}
