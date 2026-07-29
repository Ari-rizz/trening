import * as XLSX from 'xlsx';

export interface RawRow {
  [key: string]: string | number;
}

export interface ParsedFile {
  rows: RawRow[];
  errors: string[];
}

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs > semicolons && tabs > commas) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

function parseCsvText(text: string): RawRow[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 1) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter);
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delimiter);
    const row: RawRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

export function parsePastedText(text: string): ParsedFile {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], errors: ['Ingen tekst å importere'] };
  }

  const firstLine = trimmed.split(/\r?\n/)[0];
  const isTabSeparated = firstLine.includes('\t');
  const isSemicolonSeparated = firstLine.includes(';') && !isTabSeparated;

  let rawRows: RawRow[] = [];

  if (isTabSeparated || isSemicolonSeparated || firstLine.includes(',')) {
    rawRows = parseCsvText(trimmed);
  } else {
    const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
    rawRows = lines.map(line => ({ 'Øvelse': line }));
  }

  if (rawRows.length === 0) {
    return { rows: [], errors: ['Kunne ikke tolke formatet'] };
  }

  if (rawRows.length === 0) errors.push('Ingen gyldige øvelser funnet');

  return { rows: rawRows, errors };
}

export async function parseWorkbook(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const allRows: RawRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
    allRows.push(...rows);
  }

  const errors: string[] = allRows.length === 0 ? ['Ingen gyldige øvelser funnet i filen'] : [];
  return { rows: allRows, errors };
}
