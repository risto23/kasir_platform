export function toBackendDate(ddmmyyyy: string): string {
  const v = ddmmyyyy.trim();
  const m = v.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
  if (!m) throw new Error('Tanggal harus dd-mm-yyyy');
  const dd = m[1].padStart(2,'0');
  const mm = m[2].padStart(2,'0');
  const yyyy = m[3];
  return ${yyyy}--;
}

export function fromBackendDate(yyyymmdd: string): string {
  const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return yyyymmdd;
  return ${m[3]}--;
}
