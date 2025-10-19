// Service-to-Service Auth Client
// BFF uses this to get tokens and call other services

import undici from 'undici';

let cached = { token: '', exp: 0 };

export async function getServiceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp - 30 > now) return cached.token;

  const res = await undici.fetch('https://auth.api.example.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.S2S_CLIENT_ID,
      client_secret: process.env.S2S_CLIENT_SECRET,
      audience: 'files-service',
      scope: 'files:read files:write'
    })
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const json: any = await res.json();
  cached = { token: json.access_token, exp: Math.floor(Date.now()/1000) + (json.expires_in || 300) };
  return cached.token;
}

export async function callFiles(path: string, init: RequestInit = {}) {
  const token = await getServiceToken();
  const res = await undici.fetch(`https://files.api.example.com${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) { cached = { token: '', exp: 0 }; /* refresh on next call */ }
  return res;
}
