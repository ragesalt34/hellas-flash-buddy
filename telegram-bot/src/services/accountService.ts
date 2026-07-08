import crypto from 'crypto';
import { promisify } from 'util';
import { supabase } from '../supabase';
import { Account } from '../types';

// Password hashing with Node's built-in scrypt (no external deps).
// Stored form: "scrypt$<saltHex>$<hashHex>". Async (libuv thread pool) — the
// sync variant would freeze the whole single-threaded server for the duration
// of every hash, turning a burst of logins into a lag spike for everyone.
const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const ACCOUNT_COLS = 'id, username, display_name, is_guest';

export class UsernameTakenError extends Error {}

export async function registerAccount(username: string, password: string): Promise<Account> {
  const usernameCi = username.toLowerCase();

  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('username_ci', usernameCi)
    .maybeSingle();
  if (existing) throw new UsernameTakenError();

  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      username,
      username_ci: usernameCi,
      password_hash: passwordHash,
      display_name: username,
    })
    .select(ACCOUNT_COLS)
    .single();

  // Unique-violation race (two parallel registers) → treat as taken.
  if (error) {
    if (error.code === '23505') throw new UsernameTakenError();
    throw error;
  }
  return data as Account;
}

export async function loginAccount(username: string, password: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, username, display_name, is_guest, password_hash')
    .eq('username_ci', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data || !(await verifyPassword(password, (data as { password_hash: string }).password_hash))) {
    return null;
  }
  const { password_hash, ...account } = data as Account & { password_hash: string };
  void password_hash;
  return account;
}

// Shared anonymous "guest" account — created once, cached in memory.
const GUEST_USERNAME = '__guest__';
let guestIdCache: string | null = null;

export async function getGuestAccountId(): Promise<string> {
  if (guestIdCache) return guestIdCache;

  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('username_ci', GUEST_USERNAME)
    .maybeSingle();
  if (existing) {
    guestIdCache = (existing as { id: string }).id;
    return guestIdCache;
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      username: GUEST_USERNAME,
      username_ci: GUEST_USERNAME,
      // Guests can't log in — a random unusable hash, never verified against.
      password_hash: `scrypt$${crypto.randomBytes(16).toString('hex')}$${crypto.randomBytes(64).toString('hex')}`,
      display_name: null,
      is_guest: true,
    })
    .select('id')
    .single();
  // Lost an insert race → re-read.
  if (error) {
    const { data: raced } = await supabase
      .from('accounts')
      .select('id')
      .eq('username_ci', GUEST_USERNAME)
      .maybeSingle();
    if (raced) {
      guestIdCache = (raced as { id: string }).id;
      return guestIdCache;
    }
    throw error;
  }
  guestIdCache = (data as { id: string }).id;
  return guestIdCache;
}
