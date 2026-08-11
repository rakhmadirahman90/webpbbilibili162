import { createClient } from '@supabase/supabase-js';

// Get the URL from environment, fallback to the current project.
let rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
let envUrl = rawUrl || 'https://missjyvqfehamtpyodjr.supabase.co';

// Strip /rest/v1 or /rest/v1/ if present in the URL.
if (envUrl && typeof envUrl === 'string') {
  if (envUrl.endsWith('/rest/v1/')) {
    envUrl = envUrl.substring(0, envUrl.length - 9);
  } else if (envUrl.endsWith('/rest/v1')) {
    envUrl = envUrl.substring(0, envUrl.length - 8);
  }
}

const supabaseUrl = envUrl;
const rawAnon = typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY)
  : undefined;
const supabaseAnonKey = rawAnon || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Centralized API authentication: protected same-origin API requests receive
// the current Supabase access token without requiring every component to repeat it.
if (typeof window !== 'undefined' && !(window as any).__pbApiAuthInstalled) {
  (window as any).__pbApiAuthInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    try {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const url = new URL(requestUrl, window.location.origin);
      const isSameOriginApi = url.origin === window.location.origin && url.pathname.startsWith('/api/');

      if (!isSameOriginApi) return originalFetch(input, init);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return originalFetch(input, init);

      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return originalFetch(input, { ...init, headers });
    } catch (error) {
      console.warn('[API Auth] Failed to attach Supabase access token:', error);
      return originalFetch(input, init);
    }
  };
}
