const TZ = 'Asia/Tokyo';

export function toDate(x: string | number | Date): Date {
  if (x instanceof Date) return x;
  if (typeof x === 'number') return new Date(x < 1e12 ? x * 1000 : x); // 秒→ms
  // 文字列: ISO/日付-only/epoch文字列をカバー
  const s = x.trim();
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000); // "1694570400" (important-comment)
  if (/^\d{13}$/.test(s)) return new Date(Number(s));        // "1694570400000" (important-comment)
  // タイムゾーン指定のないISO日時はUTCとして解釈する。
  // バックエンドの created_at は datetime.utcnow() でナイーブUTC保存されるため、
  // 'Z' を付けないとブラウザのローカル時刻と誤解釈され9時間ずれる。
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z');
  }
  return new Date(s); // ISO文字列(オフセット付き)など
}

const jstFmt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: '2-digit', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  hour12: false,
});

const jstDateOnlyFmt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

/** 例: 24/09/13 12:00 */
export function formatJst(input: string | number | Date): string {
  return jstFmt.format(toDate(input));
}

/** 例: 2024/09/13 */
export function formatJstDate(input: string | number | Date): string {
  return jstDateOnlyFmt.format(toDate(input));
}
