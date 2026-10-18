/**
 * Utilitas waktu WIB (UTC+7).
 *
 * Salinan dari `src/lib/wib.ts` milik portal Sapa Pedestrian agar dashboard
 * menulis dan membaca stempel waktu dengan FORMAT YANG SAMA dengan dokumen
 * yang dibuat portal — penting karena `updatedAt` ditampilkan mentah oleh
 * pelacak tiket (/api/complaint-status), dan `timestamp` dibaca ulang oleh
 * dashboard untuk urutan kronologis.
 */

const TZ = 'Asia/Jakarta';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Komponen tanggal/jam WIB saat ini (aman irrespective zona waktu server). */
function wibParts(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/** Tahun WIB berjalan — dipakai untuk membandingkan bulan pada grafik tren. */
export function currentYearWIB(): number {
  return wibParts().year;
}

/**
 * Format: DD/MM/YYYY HH:MM:SS — sama dengan `timestampWIB()` di portal
 * (kompatibel dengan data lama).
 */
export function timestampWIB(): string {
  const { year, month, day, hour, minute, second } = wibParts();
  return `${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/** Timestamp WIB versi ISO-8601 dengan offset waktu (aman untuk sorting). */
export function isoWIB(): string {
  const { year, month, day, hour, minute, second } = wibParts();
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
}

/** Key sorting numerik YYYYMMDDHHmmss. */
export function sortKeyWIB(): string {
  const { year, month, day, hour, minute, second } = wibParts();
  return `${year}${pad(month)}${pad(day)}${pad(hour)}${pad(minute)}${pad(second)}`;
}

export interface AduanTimeFields {
  /** YYYYMMDDHHmmss — dipakai portal. */
  sortKey?: string;
  /** ISO-8601 WIB — dipakai portal. */
  timestampISO?: string;
  /** DD/MM/YYYY HH:MM:SS — selalu ada. */
  timestamp?: string;
}

/**
 * Nilai urut kronologis (WIB) dari dokumen aduan.
 *
 * PENTING: `timestamp` berformat "DD/MM/YYYY HH:MM:SS", sehingga
 * `new Date(timestamp)` menghasilkan Invalid Date dan perbandingan string
 * biasa SALAH urutan ("31/01/..." > "01/02/..." secara leksikal). Karena itu
 * `sortKey` (numerik) dan `timestampISO` lebih dulu dipakai, dengan
 * `timestamp` hanya sebagai cadangan terakhir.
 */
export function sortTimeWIB(d: AduanTimeFields): number {
  if (d.sortKey && /^\d{14}$/.test(d.sortKey)) return Number(d.sortKey);

  if (d.timestampISO) {
    const parsed = Date.parse(d.timestampISO);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec((d.timestamp || '').trim());
  if (m) return Number(`${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6] ?? '00'}`);

  const parsed = Date.parse(d.timestamp || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Ubah "DD/MM/YYYY HH:MM:SS" (WIB) menjadi objek Date lokal — bukan `new Date(raw)`. */
export function parseWIB(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}