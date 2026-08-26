export function getToken(): string | null {
  return localStorage.getItem('ugc_token');
}

export function setToken(token: string) {
  localStorage.setItem('ugc_token', token);
}

export function clearToken() {
  localStorage.removeItem('ugc_token');
}

export class TrialExpiredError extends Error {
  constructor() {
    super('TRIAL_EXPIRED');
  }
}

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 402) {
    window.dispatchEvent(new CustomEvent('ugc:trial-expired'));
    throw new TrialExpiredError();
  }
  return res;
}
