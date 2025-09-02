export function getAdminToken(): string | null {
  const raw = sessionStorage.getItem('adminToken');
  if (!raw) return null;
  const v = raw.trim();
  if (!v || v === 'null' || v === 'undefined') return null;
  if (!/^eyJ[\w-]*\.[\w-]+\.[\w-]+/.test(v)) return null;
  return v;
}
