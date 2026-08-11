import express from 'express';
import { createClient } from '@supabase/supabase-js';

const PROJECT_HOST = 'missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_IMAGE_HOST = PROJECT_HOST;

const csv = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const adminUserIds = () => csv(process.env.ADMIN_USER_IDS);
const adminEmails = () => csv(process.env.ADMIN_EMAILS);

const getBearerToken = (req: any): string | null => {
  const authorization = req.get?.('authorization') || req.headers?.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
};

const getSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || `https://${PROJECT_HOST}`;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

const isAdminUser = (user: any) => {
  const ids = adminUserIds();
  const emails = adminEmails();
  const appMetadata = user?.app_metadata || {};
  const roles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];
  const role = typeof appMetadata.role === 'string' ? appMetadata.role : '';

  if (ids.length && ids.includes(String(user?.id || '').toLowerCase())) return true;
  if (emails.length && emails.includes(String(user?.email || '').toLowerCase())) return true;
  if (['admin', 'super_admin', 'owner'].includes(role.toLowerCase())) return true;
  if (roles.some((item: unknown) => ['admin', 'super_admin', 'owner'].includes(String(item).toLowerCase()))) return true;

  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_AUTHENTICATED_ADMIN_IN_DEV === 'true';
};

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const client = getSupabaseServerClient();
    if (!client) {
      console.error('[Security] Supabase server auth is not configured.');
      return res.status(503).json({ error: 'Server authentication is not configured.' });
    }

    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    if (!isAdminUser(data.user)) {
      return res.status(403).json({ error: 'Administrator access required.' });
    }

    req.authUser = data.user;
    return next();
  } catch (error) {
    console.error('[Security] Authentication failure:', error);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

const buckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit = (limit: number, windowMs: number) => (req: any, res: any, next: any) => {
  const now = Date.now();
  const ip = String(req.ip || req.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const key = `${ip}:${req.path}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= limit) {
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  current.count += 1;
  return next();
};

const isAllowedImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return url.hostname === DEFAULT_IMAGE_HOST;
  } catch {
    return false;
  }
};

const validateNewsImageRequest = (req: any, res: any, next: any) => {
  const directUrl = typeof req.query?.url === 'string' ? req.query.url.trim() : '';
  if (directUrl && !isAllowedImageUrl(directUrl)) {
    return res.status(400).json({ error: 'Image proxy only accepts approved HTTPS image sources.' });
  }
  return next();
};

const hardenJsonBodyParser = () => {
  const originalJson = (express as any).json;
  (express as any).json = (options: any = {}) => originalJson({ limit: '1mb', ...options });
};

export function installExpressSecurityGuards() {
  hardenJsonBodyParser();

  const application = (express as any).application;
  const originalPost = application.post;
  const originalGet = application.get;

  application.post = function securityAwarePost(path: string, ...handlers: any[]) {
    if (path === '/api/site-settings') {
      handlers.unshift(requireAdmin, rateLimit(60, 60_000));
    } else if (path === '/api/generate-letter') {
      handlers.unshift(requireAdmin, rateLimit(5, 60_000));
    } else if (path === '/api/send-push-notification') {
      handlers.unshift(requireAdmin, rateLimit(10, 60_000));
    }
    return originalPost.call(this, path, ...handlers);
  };

  application.get = function securityAwareGet(path: string, ...handlers: any[]) {
    if (path === '/api/news-image') {
      handlers.unshift(validateNewsImageRequest, rateLimit(60, 60_000));
    }
    return originalGet.call(this, path, ...handlers);
  };

  console.log('[Security] Express API guards installed.');
}

export const securityConfig = {
  protectedRoutes: [
    'POST /api/site-settings',
    'POST /api/generate-letter',
    'POST /api/send-push-notification',
  ],
  validatedProxy: 'GET /api/news-image',
  adminSources: ['ADMIN_USER_IDS', 'ADMIN_EMAILS', 'Supabase app_metadata.role/roles'],
};
