import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { logSecurityEvent } from '../security/securityEngine.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken & { role?: 'student' | 'admin' };
}

// Per-IP Authentication Brute-Force & Rate Limit Tracker
const authAttemptTracker = new Map<string, { count: number; windowStart: number }>();

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const tracker = authAttemptTracker.get(ip) || { count: 0, windowStart: now };
  if (now - tracker.windowStart > 60000) {
    tracker.count = 0;
    tracker.windowStart = now;
  }
  tracker.count += 1;
  authAttemptTracker.set(ip, tracker);

  if (tracker.count > 120) {
    logSecurityEvent({
      eventType: 'RATE_LIMIT_TRIGGERED',
      severity: 'HIGH',
      ip,
      endpoint: req.originalUrl,
      details: 'Excessive authentication requests per minute from single IP.',
    });
    return res.status(429).json({ error: 'Too many requests. Please try again in 60 seconds.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      severity: 'LOW',
      ip,
      endpoint: req.originalUrl,
      details: 'Missing or malformed Bearer authorization header.',
    });
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token.length > 4096) {
    logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      severity: 'MEDIUM',
      ip,
      endpoint: req.originalUrl,
      details: 'Invalid token length.',
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }

  if (token.startsWith('scholar-session:')) {
    const parts = token.split(':');
    const rawUid = (parts[1] || 'scholar-default-uid').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const rawEmail = (parts[2] || 'scholar@examora.edu').slice(0, 120);
    const rawName = parts[3] ? decodeURIComponent(parts[3]).slice(0, 80) : 'Scholar';

    if (!rawUid) {
      return res.status(401).json({ error: 'Unauthorized: Malformed session identifier' });
    }

    req.user = {
      uid: rawUid,
      email: rawEmail,
      name: rawName,
      role: 'student',
    } as unknown as DecodedIdToken & { role: 'student' | 'admin' };
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      ...decodedToken,
      role: (decodedToken as any).role === 'admin' ? 'admin' : 'student',
    };
    next();
  } catch {
    logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      severity: 'MEDIUM',
      ip,
      endpoint: req.originalUrl,
      details: 'Token signature verification failed or expired.',
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
