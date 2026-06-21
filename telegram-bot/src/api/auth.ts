import crypto from 'crypto';

export interface WebAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

/**
 * Validate Telegram Mini App initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * Returns the parsed user on success, or null if the signature is invalid / expired.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60
): WebAppUser | null {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  // auth_date freshness check (guards against replay of leaked initData)
  const authDate = Number(params.get('auth_date'));
  if (authDate && Number.isFinite(authDate)) {
    const age = Date.now() / 1000 - authDate;
    if (age > maxAgeSeconds) return null;
  }

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // constant-time compare
  if (
    computed.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  ) {
    return null;
  }

  const userJson = params.get('user');
  if (!userJson) return null;
  try {
    const u = JSON.parse(userJson);
    if (typeof u.id !== 'number') return null;
    return {
      id: u.id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      language_code: u.language_code,
    };
  } catch {
    return null;
  }
}
