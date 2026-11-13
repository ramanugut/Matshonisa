export type SaId =
  | { ok: true; id: string; dob: string; age: number; gender: 'Male' | 'Female'; citizen: boolean }
  | { ok: false; error: string };

/** Validates a South African ID number (13 digits, real date of birth, citizenship digit, Luhn check) and reads the details out of it. */
export function parseSaId(raw: string): SaId {
  const id = raw.replace(/\s/g, '');
  if (!/^\d{13}$/.test(id)) return { ok: false, error: 'Enter your 13-digit South African ID number' };
  const yy = +id.slice(0, 2), mm = +id.slice(2, 4), dd = +id.slice(4, 6);
  const now = new Date();
  let dob: Date | null = null;
  for (const y of [2000 + yy, 1900 + yy]) {
    const d = new Date(Date.UTC(y, mm - 1, dd));
    if (d.getUTCFullYear() === y && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd && d <= now) { dob = d; break; }
  }
  if (!dob) return { ok: false, error: 'This ID number does not contain a valid date of birth' };
  if (id[10] !== '0' && id[10] !== '1') return { ok: false, error: 'This is not a valid South African ID number' };
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = +id[12 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  if (sum % 10 !== 0) return { ok: false, error: 'This ID number is not valid. Please check each digit.' };
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age--;
  return { ok: true, id, dob: dob.toISOString().slice(0, 10), age, gender: +id.slice(6, 10) >= 5000 ? 'Male' : 'Female', citizen: id[10] === '0' };
}

export const validSaPhone = (p: string) => /^(\+27|0)[0-9]{9}$/.test(p.replace(/\s/g, ''));
