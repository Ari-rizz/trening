import { Exercise, MuscleGroup, Equipment } from './supabase';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, getMuscleGroupLabel } from './exercises-data';

// Norwegian + English aliases for muscle groups and equipment, so typing
// "bryst" or "chest" surfaces chest exercises even when the exercise name
// itself doesn't contain the word.
const MUSCLE_GROUP_ALIASES: Record<string, string[]> = {
  chest: ['bryst', 'chest', 'pectoralis', 'pecs', 'pectoral', 'brystkasse'],
  back: ['rygg', 'back', 'lats', 'latissimus', 'rhomboid', 'traps', 'lat', 'ryggrad'],
  shoulders: ['skuldre', 'shoulder', 'shoulders', 'deltoid', 'delts', 'delt', 'skulder'],
  biceps: ['biceps', 'bicep', 'bizeps', 'bicep curl', 'biceps curl'],
  triceps: ['triceps', 'tricep', 'trizeps', 'triceps brachii'],
  legs: ['bein', 'legs', 'leg', 'quads', 'quadriceps', 'hamstrings', 'hamstring', 'quads bein', 'lår', 'legger'],
  abs: ['mage', 'abs', 'abdominal', 'abdominals', 'core', 'magemuskler', 'sixpack', 'six pack', 'magen'],
  glutes: ['glutes', 'glute', 'gluteus', 'rumpe', 'rumpebryn', 'butt', 'bum'],
  forearms: ['underarm', 'forearms', 'forearm', 'underarme', 'underarmer', 'grip'],
  'full body': ['full kropp', 'full body', 'whole body', 'hele kroppen', 'total body'],
  cardio: ['cardio', 'kondisjon', 'utholdenhet', 'aerobic', 'aerob', 'hjerte', 'conditioning'],
};

const EQUIPMENT_ALIASES: Record<string, string[]> = {
  barbell: ['stang', 'barbell', 'bar', 'bb', 'olympic bar', 'olympisk stang', 'stangvekt'],
  dumbbell: ['hantler', 'hantel', 'dumbbell', 'dumbbells', 'db', 'dumbell', 'dumbells', 'hantelsett'],
  cable: ['kabel', 'cable', 'cables', 'kablar', 'kabelmaskin', 'kabel trekk'],
  machine: ['maskin', 'machine', 'machines', 'maskiner', 'apparat'],
  bodyweight: ['kroppsvekt', 'bodyweight', 'body weight', 'kroppvekt', 'kroppsvekt', 'bw', 'egen vekt'],
  kettlebell: ['kettlebell', 'kettlebells', 'kb', 'kettlebell vekt', 'girja'],
  'resistance band': ['strikke', 'resistance band', 'band', 'bands', 'resistance bands', 'strikkeband', 'elastisk', 'elastisk strikk'],
  other: ['annet', 'other', 'diverse', 'misc'],
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getMuscleGroupAliases(value: string): string[] {
  return MUSCLE_GROUP_ALIASES[value] ?? [];
}

function getEquipmentAliases(value: string): string[] {
  return EQUIPMENT_ALIASES[value] ?? [];
}

export interface ScoredSearchResult {
  exercise: Exercise;
  score: number;
}

/**
 * Levenshtein distance between two strings, capped at `maxDistance`.
 * Returns `maxDistance + 1` if the distance exceeds the cap, so callers can
 * bail out early for performance.
 */
function levenshtein(a: string, b: string, maxDistance: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDistance) return maxDistance + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Token-based fuzzy similarity. Splits both strings into word tokens and
 * finds the best matching token pair, then computes a 0..1 similarity ratio
 * based on Levenshtein distance relative to the longer token.
 * Returns 0 if nothing is reasonably similar.
 */
function tokenSimilarity(search: string, target: string): number {
  const searchTokens = search.split(' ').filter(Boolean);
  const targetTokens = target.split(' ').filter(Boolean);
  if (searchTokens.length === 0 || targetTokens.length === 0) return 0;

  let best = 0;
  for (const st of searchTokens) {
    for (const tt of targetTokens) {
      const maxLen = Math.max(st.length, tt.length);
      if (maxLen === 0) continue;
      // Quick exact-token shortcut
      if (st === tt) {
        best = Math.max(best, 1);
        continue;
      }
      // Only attempt fuzzy on tokens of reasonable length
      if (st.length < 3 || tt.length < 3) continue;
      const maxDist = Math.ceil(maxLen * 0.4);
      const dist = levenshtein(st, tt, maxDist);
      if (dist <= maxDist) {
        const ratio = 1 - dist / maxLen;
        if (ratio > best) best = ratio;
      }
    }
  }
  return best;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scores how well an exercise matches a search term.
 *
 * Ranking (higher = better):
 *  100 - exact name match
 *  90  - exact nickname match
 *  80  - name starts with search
 *  70  - nickname starts with search
 *  60  - name contains search (word boundary)
 *  50  - nickname contains search (word boundary)
 *  40  - name contains search (anywhere)
 *  30  - nickname contains search (anywhere)
 *  20  - muscle group label/alias matches
 *  10  - equipment label/alias matches
 *   1..8 - fuzzy token similarity (lower-confidence, near matches)
 *
 * Returns 0 if nothing matches.
 */
export function scoreExercise(exercise: Exercise, rawSearch: string): number {
  const search = normalize(rawSearch);
  if (!search) return 0;

  const name = normalize(exercise.name);
  if (name === search) return 100;
  if (name.startsWith(search)) return 80;
  if (new RegExp(`\\b${escapeRegex(search)}`).test(name)) return 60;
  if (name.includes(search)) return 40;

  const nicknames = (exercise.nicknames ?? []).map(normalize);
  for (const nick of nicknames) {
    if (nick === search) return 90;
  }
  for (const nick of nicknames) {
    if (nick.startsWith(search)) return 70;
  }
  for (const nick of nicknames) {
    if (new RegExp(`\\b${escapeRegex(search)}`).test(nick)) return 50;
  }
  for (const nick of nicknames) {
    if (nick.includes(search)) return 30;
  }

  // Muscle group label + aliases
  const mgLabel = normalize(getMuscleGroupLabel(exercise.muscle_group));
  if (mgLabel === search || mgLabel.includes(search)) return 20;
  for (const alias of getMuscleGroupAliases(exercise.muscle_group)) {
    const a = normalize(alias);
    if (a === search || a.includes(search)) return 20;
  }

  // Secondary muscles
  const secondary = exercise.secondary_muscles ?? [];
  for (const sm of secondary) {
    for (const alias of getMuscleGroupAliases(sm)) {
      const a = normalize(alias);
      if (a === search || a.includes(search)) return 20;
    }
  }

  // Equipment label + aliases
  const eqLabel = normalize(
    EQUIPMENT_OPTIONS.find(e => e.value === exercise.equipment)?.label ?? exercise.equipment
  );
  if (eqLabel === search || eqLabel.includes(search)) return 10;
  for (const alias of getEquipmentAliases(exercise.equipment)) {
    const a = normalize(alias);
    if (a === search || a.includes(search)) return 10;
  }

  // Fuzzy token similarity — only when nothing above matched.
  // Threshold of 0.6 keeps results relevant while surfacing near-misses
  // (e.g. "Benk Press" ~ "Barbell Bench Press", "Knebøy" ~ "Squat").
  const nameSim = tokenSimilarity(search, name);
  if (nameSim >= 0.6) {
    return Math.round(1 + nameSim * 7); // 1..8
  }
  for (const nick of nicknames) {
    const nickSim = tokenSimilarity(search, nick);
    if (nickSim >= 0.6) {
      return Math.round(1 + nickSim * 7);
    }
  }

  return 0;
}

/**
 * Filter and rank exercises by a search term. Non-matching exercises are
 * excluded. Results are sorted by score (desc) then name (asc).
 */
export function searchExercises(
  exercises: Exercise[],
  search: string
): Exercise[] {
  const term = search.trim();
  if (!term) return exercises;

  const scored: ScoredSearchResult[] = [];
  for (const exercise of exercises) {
    const score = scoreExercise(exercise, term);
    if (score > 0) scored.push({ exercise, score });
  }

  scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return scored.map(s => s.exercise);
}

/**
 * Indicates whether a search produced only fuzzy (non-exact) matches.
 * Returns true when there is at least one result but none of the results
 * scored above the fuzzy threshold (i.e. all results are similarity-based).
 */
export function isOnlyFuzzyMatches(exercises: Exercise[], search: string): boolean {
  const term = search.trim();
  if (!term) return false;
  let any = false;
  for (const exercise of exercises) {
    const score = scoreExercise(exercise, term);
    if (score > 0) {
      any = true;
      if (score >= 10) return false; // at least one non-fuzzy match
    }
  }
  return any;
}
