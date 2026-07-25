/**
 * Generate RFC 4180 compliant CSV content string from headers and data rows.
 */
export function generateCsv(headers: string[], rows: Record<string, any>[]): string {
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}
