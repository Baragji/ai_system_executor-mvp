// Service-to-Service Auth Server
// Files service (and others) use this to verify tokens from BFF

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NextFunction, Request, Response } from 'express';

const jwks = createRemoteJWKSet(new URL('https://auth.api.example.com/.well-known/jwks.json'));

export async function verifyServiceAuth(requiredAud: string, requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
      if (!token) return res.status(401).json({ title: 'Unauthorized' });

      const { payload } = await jwtVerify(token, jwks, {
        issuer: 'https://auth.api.example.com/',
        audience: requiredAud
      });

      const sub = String(payload.sub || '');
      if (!sub.startsWith('service:')) return res.status(403).json({ title: 'Forbidden' });

      const tokenScopes = String(payload.scope || '').split(' ').filter(Boolean);
      const missing = requiredScopes.filter(s => !tokenScopes.includes(s));
      if (missing.length) return res.status(403).json({ title: 'Missing scope', detail: missing.join(',') });

      (req as any).service = { id: sub, scopes: tokenScopes };
      return next();
    } catch (e) {
      return res.status(401).json({ title: 'Invalid token' });
    }
  };
}

// Usage:
// app.post('/api/files', verifyServiceAuth('files-service', ['files:write']), handler)
