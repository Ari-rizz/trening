import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export interface ParsedRow {
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  rest?: number;
  notes?: string;
  warnings: string[];
}

export interface ParsedProgram {
  name: string;
  rows: ParsedRow[];
  errors: string[];
}

interface RawRow {
  [key: string]: string | number;
}

const HEADER_ALIASES: Record<string, string[]> = {
  exerciseName: ['øvelse', 'exercise', 'name', 'navn', 'øvelsesnavn', 'exercise name'],
  sets: ['sett', 'sets', 'antall sett'],
  reps: ['reps', 'repetisjoner', 'gjentakelser'],
  weight: ['vekt', 'weight', 'kg', 'vekt kg', 'target weight'],
  rest: ['hvile', 'pause', 'rest', 'hviletid', 'rest seconds'],
  notes: ['notater', 'notes', 'kommentar', 'comment'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]+/g, ' ').trim();
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const idx = normalized.indexOf(normAlias);
    if (idx !== -1) return headers[idx];
  }
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const idx = normalized.findIndex(h => h.includes(normAlias));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseNumber(val: string | number | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val)
    .replace(/\s/g, '')
    .replace(/,(?=\d{1,2}$)/, '.')
    .replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
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
  if (lines.length < 2) return [];
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

function mapRows(rawRows: RawRow[]): ParsedRow[] {
  if (rawRows.length === 0) return [];
  const headers = Object.keys(rawRows[0]);
  const nameCol = findColumn(headers, HEADER_ALIASES.exerciseName);
  const setsCol = findColumn(headers, HEADER_ALIASES.sets);
  const repsCol = findColumn(headers, HEADER_ALIASES.reps);
  const weightCol = findColumn(headers, HEADER_ALIASES.weight);
  const restCol = findColumn(headers, HEADER_ALIASES.rest);
  const notesCol = findColumn(headers, HEADER_ALIASES.notes);

  return rawRows.map((raw, idx) => {
    const warnings: string[] = [];
    const exerciseName = nameCol ? String(raw[nameCol] ?? '').trim() : '';
    if (!exerciseName) warnings.push(`Rad ${idx + 2}: Mangler øvelsesnavn`);

    const sets = setsCol ? Math.round(parseNumber(raw[setsCol])) : 3;
    const reps = repsCol ? Math.round(parseNumber(raw[repsCol])) : 0;
    const weight = weightCol ? parseNumber(raw[weightCol]) : 0;
    const rest = restCol ? Math.round(parseNumber(raw[restCol])) : undefined;
    const notes = notesCol ? String(raw[notesCol] ?? '').trim() : undefined;

    if (sets <= 0) warnings.push(`Rad ${idx + 2}: Ugyldig antall sett (${sets})`);
    if (reps <= 0 && weight > 0) warnings.push(`Rad ${idx + 2}: Reps mangler`);

    return { exerciseName, sets: Math.max(1, sets), reps, weight, rest, notes, warnings };
  });
}

export function parsePastedText(text: string): ParsedProgram {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return { name: '', rows: [], errors: ['Ingen tekst å importere'] };
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
    return { name: '', rows: [], errors: ['Kunne ikke tolke formatet'] };
  }

  const rows = mapRows(rawRows).filter(r => r.exerciseName);
  if (rows.length === 0) errors.push('Ingen gyldige øvelser funnet');

  return { name: '', rows, errors };
}

export async function parseWorkbook(file: File): Promise<ParsedProgram> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '' });
  const rows = mapRows(rawRows).filter(r => r.exerciseName);
  const errors: string[] = rows.length === 0 ? ['Ingen gyldige øvelser funnet i filen'] : [];
  return { name: file.name.replace(/\.(xlsx|xls|csv)$/i, ''), rows, errors };
}

export async function importParsedProgram(
  program: ParsedProgram,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (program.rows.length === 0) return { success: false, error: 'Ingen øvelser å importere' };

  const { data: template, error: tmplError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: userId,
      name: program.name || 'Importert plan',
      description: `Importert ${new Date().toLocaleDateString('nb-NO')}`,
    })
    .select('id')
    .single();

  if (tmplError || !template) return { success: false, error: 'Kunne ikke opprette plan' };

  const exerciseNames = Array.from(new Set(program.rows.map(r => r.exerciseName)));
  const { data: existingExercises } = await supabase
    .from('exercises')
    .select('id, name')
    .in('name', exerciseNames);

  const nameToId = new Map((existingExercises ?? []).map(e => [e.name.toLowerCase(), e.id]));

  const exercisesToInsert = program.rows
    .map((row, idx) => {
      const exerciseId = nameToId.get(row.exerciseName.toLowerCase());
      if (!exerciseId) return null;
      return {
        template_id: template.id,
        exercise_id: exerciseId,
        order_index: idx,
        target_sets: row.sets,
        target_reps: row.reps,
        target_weight_kg: row.weight,
        notes: row.notes ?? '',
        warmup_sets: 0,
        is_unilateral: false,
        superset_group: null,
      };
    })
    .filter(Boolean);

  if (exercisesToInsert.length === 0) {
    return { success: false, error: 'Ingen av øvelsene ble funnet i databasen' };
  }

  const { error: insertError } = await supabase
    .from('template_exercises')
    .insert(exercisesToInsert);

  if (insertError) return { success: false, error: 'Kunne ikke lagre øvelsene' };

  const missing = program.rows.filter(r => !nameToId.has(r.exerciseName.toLowerCase()));
  if (missing.length > 0) {
    return {
      success: true,
      error: `${missing.length} øvelse(r) ble hoppet over (ikke funnet): ${missing.map(m => m.exerciseName).join(', ')}`,
    };
  }

  return { success: true };
}
