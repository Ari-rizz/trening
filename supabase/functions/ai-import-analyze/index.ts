import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  try {
    if (!OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY er ikke konfigurert. Gå til prosjektinnstillinger for å legge til nøkkelen.", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonError("Invalid user token", 401);

    const userId = userData.user.id;

    const body = await req.json();
    const { rows } = body as { rows: RawRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return jsonError("No rows provided for analysis", 400);
    }

    // Extract tempo from rows before sending to AI
    const processedRows = rows.map(extractTempo);

    // Pre-filter: remove rows that are clearly NOT exercises
    const filteredRows = filterNonExerciseRows(processedRows);
    if (filteredRows.length === 0) {
      return jsonError("Ingen gyldige øvelser funnet i filen. Filen ser ut til å inneholde kun instruksjoner, tidsplaner eller ernæringsinfo.", 400);
    }

    // Fetch exercise names + nicknames + metadata for local matching
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, nicknames, muscle_group, equipment");

    if (exError) {
      console.error("Failed to fetch exercises:", exError);
      return jsonError("Failed to fetch exercise catalogue", 500);
    }

    // Build lookup structures for fast local matching
    const exerciseList: ExerciseRecord[] = (exercises ?? []).map(e => ({
      id: e.id,
      name: e.name,
      nicknames: e.nicknames ?? [],
      muscleGroup: e.muscle_group,
      equipment: e.equipment,
    }));

    const nameToId = new Map<string, string>();
    const nameToExerciseName = new Map<string, string>();

    for (const e of exerciseList) {
      const key = normalizeName(e.name);
      nameToId.set(key, e.id);
      nameToExerciseName.set(key, e.name);
      for (const nick of e.nicknames) {
        const nickKey = normalizeName(nick);
        if (!nameToId.has(nickKey)) {
          nameToId.set(nickKey, e.id);
          nameToExerciseName.set(nickKey, e.name);
        }
      }
    }

    // Extract unique exercise names from the imported rows
    const uniqueNames = extractUniqueExerciseNames(filteredRows);

    // Match each unique name locally
    const matchResults = new Map<string, LocalMatch>();
    const unmatchedNames: string[] = [];

    for (const name of uniqueNames) {
      const match = matchLocally(name, nameToId, nameToExerciseName, exerciseList);
      if (match) {
        matchResults.set(name, match);
      } else {
        unmatchedNames.push(name);
      }
    }

    // For unmatched names, find top-5 candidates by token similarity for AI
    const aiCandidates = new Map<string, string[]>();
    for (const name of unmatchedNames) {
      const candidates = findTopCandidates(name, exerciseList, 5);
      aiCandidates.set(name, candidates);
    }

    // Call AI for: plan grouping + metadata for unmatched + similarity matching
    const aiResult = await callOpenAI(filteredRows, unmatchedNames, aiCandidates);

    if (!aiResult) {
      return jsonError("AI returnerte ingen gyldig respons. Prøv igjen.", 502);
    }

    // Merge AI plan grouping with local matching results
    const processedPlans = await processAiResult(aiResult, matchResults, userId, nameToId, exerciseList);

    // Validate: ensure every unique exercise name appears in at least one plan
    const allOutputNames = new Set<string>();
    for (const plan of processedPlans) {
      for (const ex of plan.exercises) {
        allOutputNames.add(ex.originalName);
      }
    }
    for (const name of uniqueNames) {
      if (!allOutputNames.has(name) && processedPlans.length > 0) {
        const localMatch = matchResults.get(name);
        const meta = aiResult.unmatchedMetadata?.[name] ?? {};
        processedPlans[0].exercises.push({
          exerciseId: localMatch?.exerciseId ?? null,
          originalName: name,
          matchedName: localMatch?.matchedName ?? null,
          matchType: localMatch?.matchType ?? "new",
          isNew: !localMatch,
          sets: 3,
          reps: 10,
          weight: 0,
          rest: null,
          notes: null,
          muscleGroup: meta.muscleGroup ?? null,
          equipment: meta.equipment ?? null,
          difficulty: meta.difficulty ?? null,
        });
      }
    }

    return jsonResponse({ plans: processedPlans });
  } catch (err: any) {
    console.error("ai-import-analyze error:", err);
    return jsonError(err.message ?? "Internal server error", 500);
  }
});

// ===== Types =====

interface RawRow {
  [key: string]: string | number;
}

interface ExerciseRecord {
  id: string;
  name: string;
  nicknames: string[];
  muscleGroup: string;
  equipment: string;
}

interface LocalMatch {
  exerciseId: string;
  matchedName: string;
  matchType: "exact" | "nickname" | "normalized" | "ai_similarity";
}

interface AiExercise {
  originalName: string;
  sets: number;
  reps: number;
  weight: number;
  rest?: number | null;
  notes?: string | null;
  newExerciseName?: string | null;
  muscleGroup?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
}

interface AiPlan {
  name: string;
  dayLabel: string;
  exercises: AiExercise[];
}

interface AiResponse {
  plans: AiPlan[];
  unmatchedMetadata?: Record<string, {
    newExerciseName?: string | null;
    muscleGroup?: string | null;
    secondaryMuscles?: string[] | null;
    equipment?: string | null;
    difficulty?: string | null;
    instructions?: string | null;
  }>;
  similarityMatches?: Record<string, string | null>;
}

// ===== Non-Exercise Row Filtering =====
// Conservative: only remove rows that are OBVIOUSLY not exercises (long paragraphs,
// bare schedule days, single letters). Let the AI handle the rest.

const SCHEDULE_DAYS_EXACT = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday",
  "saturday", "sunday", "mandag", "tirsdag", "onsdag",
  "torsdag", "fredag", "lørdag", "søndag",
  "day", "dag", "week", "uke",
]);

function isLikelyExerciseName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // Very long text — almost certainly a paragraph/instruction, not an exercise
  if (trimmed.length > 80) return false;

  const lower = trimmed.toLowerCase();

  // Bare schedule day names
  if (SCHEDULE_DAYS_EXACT.has(lower)) return false;

  // Single letters (A, B, C variation labels)
  if (trimmed.length === 1 && /^[a-z]$/i.test(trimmed)) return false;

  return true;
}

function extractRowName(row: RawRow): string {
  const nameKeys = Object.keys(row).filter(
    k => {
      const lk = k.toLowerCase();
      return lk.includes("øvelse") || lk.includes("exercise") ||
             lk === "name" || lk === "navn" ||
             lk.includes("movement") || lk.includes("lift") ||
             lk.includes("bevegelse");
    }
  );

  if (nameKeys.length > 0) {
    return String(row[nameKeys[0]] ?? "").trim();
  }

  const firstString = Object.values(row).find(v => typeof v === "string" && String(v).trim());
  return firstString ? String(firstString).trim() : "";
}

function filterNonExerciseRows(rows: RawRow[]): RawRow[] {
  const filtered = rows.filter(row => isLikelyExerciseName(extractRowName(row)));
  // Safety net: if filtering removed everything, return original rows and let AI handle it
  return filtered.length > 0 ? filtered : rows;
}

// ===== Tempo Extraction =====

function extractTempo(row: RawRow): RawRow {
  const result = { ...row };
  const tempoPattern = /(\d|[xX])[/-](\d|[xX])[/-](\d|[xX])(?:[/-](\d|[xX]))?/g;
  let tempoValue: string | null = null;

  // Check for explicit tempo column
  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("tempo")) {
      const val = String(result[key] ?? "").trim();
      if (val) {
        tempoValue = val;
        delete result[key];
      }
    }
  }

  // Check notes/comments field for tempo pattern
  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("note") || lowerKey.includes("kommentar") || lowerKey.includes("comment")) {
      const val = String(result[key] ?? "");
      const match = val.match(/(\d|[xX])[\/\s*-](\d|[xX])[\/\s*-](\d|[xX])(?:[\/\s*-](\d|[xX]))?/i);
      if (match && !tempoValue) {
        tempoValue = match[0].replace(/\s/g, "").replace(/-/g, "-");
      }
    }
  }

  // If tempo found, append to notes
  if (tempoValue) {
    const cleanTempo = tempoValue.replace(/\s/g, "");
    for (const key of Object.keys(result)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("note") || lowerKey.includes("kommentar") || lowerKey.includes("comment")) {
        const existing = String(result[key] ?? "").trim();
        result[key] = existing
          ? `${existing} | Tempo: ${cleanTempo}`
          : `Tempo: ${cleanTempo}`;
        return result;
      }
    }
    // If no notes field exists, add one
    result["Notater"] = `Tempo: ${cleanTempo}`;
  }

  return result;
}

// ===== Normalization & Token Matching =====

const ABBREVIATIONS: Record<string, string> = {
  "db": "dumbbell",
  "bb": "barbell",
  "pu": "pullup",
  "kb": "kettlebell",
  "rdl": "romanian deadlift",
  "ohp": "overhead press",
  "mp": "military press",
  "bp": "bench press",
  "dl": "deadlift",
  "sq": "squat",
  "hspu": "handstand pushup",
  "gpp": "general physical preparedness",
};

const SYNONYMS: Record<string, string> = {
  "benk": "bench",
  "benkpress": "bench press",
  "skråbenk": "incline bench",
  "knebøy": "squat",
  "markløft": "deadlift",
  "roing": "row",
  "press": "press",
  "skuldrepress": "shoulder press",
  "brystpress": "chest press",
  "hantel": "dumbbell",
  "stang": "barbell",
  "kabel": "cable",
  "maskin": "machine",
  "kroppsvekt": "bodyweight",
  "fly": "fly",
  "flyes": "fly",
  "hev": "raise",
  "løft": "raise",
  "sidehev": "lateral raise",
  "sideløft": "lateral raise",
  "bøyd": "bent over",
  "sittende": "seated",
  "stående": "standing",
  "liggende": "lying",
  "en arm": "one arm",
  "smalt grep": "close grip",
  "bredt grep": "wide grip",
};

const FILLER_WORDS = new Set([
  "the", "a", "an", "with", "and", "or", "-",
  "medium", "grip", "version", "bands", "band",
  "chest", "triceps", "version", "focus", "focused",
  "if", "needed", "required",
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function tokenize(name: string): string[] {
  let normalized = normalizeName(name);

  // Replace abbreviations
  const words = normalized.split(" ");
  const expanded = words.map(w => ABBREVIATIONS[w] ?? w);
  normalized = expanded.join(" ");

  // Replace synonyms
  for (const [syn, main] of Object.entries(SYNONYMS)) {
    if (normalized.includes(syn)) {
      normalized = normalized.replace(new RegExp(syn, "g"), main);
    }
  }

  // Re-normalize after synonym replacement
  normalized = normalizeName(normalized);

  let tokens = normalized.split(" ").filter(t => t.length > 0);

  // Remove filler words
  tokens = tokens.filter(t => !FILLER_WORDS.has(t));

  return tokens;
}

function tokenSet(tokens: string[]): Set<string> {
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return intersection / union;
}

function matchLocally(
  name: string,
  nameToId: Map<string, string>,
  nameToExerciseName: Map<string, string>,
  exerciseList: ExerciseRecord[]
): LocalMatch | null {
  const normalized = normalizeName(name);

  // 1. Direct match on normalized name
  if (nameToId.has(normalized)) {
    return {
      exerciseId: nameToId.get(normalized)!,
      matchedName: nameToExerciseName.get(normalized)!,
      matchType: "exact",
    };
  }

  // 2. Try without spaces (e.g. "benchpress" vs "bench press")
  const noSpaces = normalized.replace(/\s+/g, "");
  if (nameToId.has(noSpaces)) {
    return {
      exerciseId: nameToId.get(noSpaces)!,
      matchedName: nameToExerciseName.get(noSpaces)!,
      matchType: "normalized",
    };
  }

  // 3. Token-based Jaccard similarity matching
  const inputTokens = tokenSet(tokenize(name));
  let bestScore = 0;
  let bestId: string | null = null;
  let bestName: string | null = null;

  for (const ex of exerciseList) {
    const exTokens = tokenSet(tokenize(ex.name));
    const score = jaccardSimilarity(inputTokens, exTokens);

    if (score > bestScore) {
      bestScore = score;
      bestId = ex.id;
      bestName = ex.name;
    }

    // Also check nicknames
    for (const nick of ex.nicknames) {
      const nickTokens = tokenSet(tokenize(nick));
      const nickScore = jaccardSimilarity(inputTokens, nickTokens);
      if (nickScore > bestScore) {
        bestScore = nickScore;
        bestId = ex.id;
        bestName = ex.name;
      }
    }
  }

  // High confidence threshold
  if (bestScore >= 0.7 && bestId) {
    return {
      exerciseId: bestId,
      matchedName: bestName!,
      matchType: "normalized",
    };
  }

  // 4. Substring matching as a fallback for short names
  if (normalized.length >= 4) {
    for (const [key, id] of nameToId) {
      const exName = nameToExerciseName.get(key)!;
      if (exName.toLowerCase().includes(normalized) || normalized.includes(key)) {
        return {
          exerciseId: id,
          matchedName: exName,
          matchType: "normalized",
        };
      }
    }
  }

  return null;
}

function findTopCandidates(name: string, exerciseList: ExerciseRecord[], topN: number): string[] {
  const inputTokens = tokenSet(tokenize(name));
  const scored: { name: string; score: number }[] = [];

  for (const ex of exerciseList) {
    const exTokens = tokenSet(tokenize(ex.name));
    const score = jaccardSimilarity(inputTokens, exTokens);
    scored.push({ name: ex.name, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.name);
}

// ===== Unique Name Extraction =====

function extractUniqueExerciseNames(rows: RawRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const nameKeys = Object.keys(row).filter(
      k => k.toLowerCase().includes("øvelse") || k.toLowerCase().includes("exercise") || k.toLowerCase() === "name"
    );
    for (const key of nameKeys) {
      const val = row[key];
      if (typeof val === "string" && val.trim()) {
        names.add(val.trim());
      }
    }
    if (nameKeys.length === 0) {
      const firstString = Object.values(row).find(v => typeof v === "string" && v.trim());
      if (firstString && typeof firstString === "string") {
        names.add(firstString.trim());
      }
    }
  }
  return Array.from(names);
}

// ===== OpenAI Call =====

async function callOpenAI(
  rows: RawRow[],
  unmatchedNames: string[],
  aiCandidates: Map<string, string[]>
): Promise<AiResponse | null> {
  const systemPrompt = `You are a fitness expert assistant that analyzes workout program data imported from Excel/CSV files.
Your job is to:
1. Detect and group rows into separate training plans/sessions (e.g. "Dag A", "Dag B", "Push", "Pull", "Leg Day").
2. Collapse repeated identical sessions (e.g. "Uke 1 Dag A", "Uke 2 Dag A", "Uke 3 Dag A" with the same exercises) into ONE plan.
3. For each exercise in each plan, preserve the original name, sets, reps, weight, rest, and notes from the data.
4. For the list of unmatched exercise names, generate metadata: muscleGroup, secondaryMuscles, equipment, difficulty, instructions, and a normalized name.
5. For unmatched exercise names where candidate matches are provided, determine if the imported name refers to the same exercise as one of the candidates. If so, return the candidate name in similarityMatches. If not, return null.

CRITICAL RULES:
- Every exercise row in the input MUST appear in the output. Never skip, drop, or merge exercises. If you cannot identify an exercise, still include it with its original name.
- ONLY include rows that are ACTUAL EXERCISES. An exercise has a name that describes a physical movement (e.g. Back Squat, Bench Press, Romanian Deadlift, Leg Curl). 
- SKIP any row that is NOT an exercise: instructional text, "How this workbook works", schedule headers (Monday, Tuesday, Weekly Schedule), nutrition info (Calories, Protein, Creatine, macros), variation labels (A, B, C by themselves), rest day notes, or any descriptive paragraph.
- If a row contains a sentence or paragraph of text, it is NOT an exercise — skip it.
- If a row is just a single letter like "A", "B", "C", it is a variation label — skip it.
- If a row says "Monday", "Tuesday", etc., it is a schedule header — skip it.

VARIATION HANDLING:
- If the file has variations A, B, C of the same day type (e.g. "Chest A", "Chest B", "Chest C", "Legs A", "Legs B", "Legs C"), create SEPARATE plans for each variation and include the variation in the plan name (e.g. "Chest A", "Chest B", "Chest C").
- Do NOT collapse A/B/C variations into one plan — they contain different exercises.
- ONLY collapse sessions that are truly identical: same exercises, same sets, same reps, repeated across different weeks.

You must respond with a JSON object matching this exact structure:
{
  "plans": [
    {
      "name": "string - the plan name (e.g. 'Dag A', 'Push Day')",
      "dayLabel": "string - a short label for the session (e.g. 'Dag A', 'Økt 1')",
      "exercises": [
        {
          "originalName": "string - the exercise name as it appeared in the file",
          "sets": number,
          "reps": number,
          "weight": number,
          "rest": number | null,
          "notes": "string | null"
        }
      ]
    }
  ],
  "unmatchedMetadata": {
    "<originalName>": {
      "newExerciseName": "string - normalized name",
      "muscleGroup": "string",
      "secondaryMuscles": ["string"],
      "equipment": "string",
      "difficulty": "string",
      "instructions": "string"
    }
  },
  "similarityMatches": {
    "<originalName>": "string - matched exercise name from candidates, or null"
  }
}

Rules:
- If the file has multiple sheets or sections that look like separate training days, create multiple plans.
- If the same day/session is repeated across weeks with identical exercises, collapse into one plan.
- For muscleGroup use: chest, back, shoulders, biceps, triceps, legs, abs, glutes, forearms, full body, cardio.
- For equipment use: barbell, dumbbell, cable, machine, bodyweight, kettlebell, resistance band, other.
- For difficulty use: beginner, intermediate, advanced.
- Always respond in the same language as the input (Norwegian or English).
- Keep instructions concise (1-2 sentences).
- If sets/reps/weight are missing or invalid, default to 3 sets, 10 reps, 0 weight.
- The unmatchedMetadata keys MUST exactly match the originalName values from the unmatched list.
- For similarityMatches: only include keys for names where candidates were provided. Return the best matching candidate name, or null if none match well. Be generous — "Close-Grip Bench Press" matches "Triceps Bench Press", "Flat DB Press" matches "Dumbbell Bench Press", "Machine Chest Press" matches "Machine Bench Press", etc.
- If notes already contain "Tempo: X-X-X", keep it in the notes field.`;

  let unmatchedSection: string;
  if (unmatchedNames.length === 0) {
    unmatchedSection = "All exercises were matched. Leave unmatchedMetadata as an empty object and similarityMatches as an empty object.";
  } else {
    const lines: string[] = [];
    lines.push("Unmatched exercise names that need metadata and similarity matching:\n");
    for (const name of unmatchedNames) {
      const candidates = aiCandidates.get(name);
      if (candidates && candidates.length > 0) {
        lines.push(`- "${name}" (candidates: ${candidates.map(c => `"${c}"`).join(", ")})`);
      } else {
        lines.push(`- "${name}"`);
      }
    }
    unmatchedSection = lines.join("\n");
  }

  const userMessage = `Here is the raw data from the imported file (JSON array of row objects):
${JSON.stringify(rows.slice(0, 500))}

${unmatchedSection}

Analyze the data and return the structured JSON response. Remember: EVERY exercise must appear in the output.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", response.status, errText);
      let userMessage = "AI-analyse feilet";
      if (response.status === 401) userMessage = "OpenAI API-nøkkelen er ugyldig. Sjekk konfigurasjonen.";
      else if (response.status === 429) userMessage = "For mange forespørsler til OpenAI. Vent litt og prøv igjen.";
      else if (response.status === 500 || response.status === 503) userMessage = "OpenAI-server feilet. Prøv igjen senere.";
      throw new Error(`${userMessage} (${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("OpenAI returned no content:", JSON.stringify(data));
      return null;
    }

    const parsed = JSON.parse(content) as AiResponse;
    if (!parsed.plans || !Array.isArray(parsed.plans)) {
      console.error("OpenAI returned invalid structure:", content.slice(0, 500));
      return null;
    }

    return parsed;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("OpenAI call timed out");
      throw new Error("AI-analyse tidsavbrutt (over 180 sekunder). Prøv igjen.");
    }
    throw err;
  }
}

// ===== Process AI Result =====

async function processAiResult(
  aiResult: AiResponse,
  matchResults: Map<string, LocalMatch>,
  userId: string,
  nameToId: Map<string, string>,
  exerciseList: ExerciseRecord[]
) {
  const processedPlans: ProcessedPlan[] = [];
  const unmatchedMetadata = aiResult.unmatchedMetadata ?? {};
  const similarityMatches = aiResult.similarityMatches ?? {};

  // Build a name-to-exercise lookup for AI similarity matches
  const exerciseByName = new Map<string, ExerciseRecord>();
  for (const ex of exerciseList) {
    exerciseByName.set(ex.name.toLowerCase(), ex);
  }

  for (const plan of aiResult.plans) {
    const processedExercises: ProcessedExercise[] = [];

    for (const ex of plan.exercises) {
      let exerciseId: string | null = null;
      let matchType: string = "new";
      let matchedName: string | null = null;

      // 1. Check local match first
      const localMatch = matchResults.get(ex.originalName);
      if (localMatch) {
        exerciseId = localMatch.exerciseId;
        matchedName = localMatch.matchedName;
        matchType = localMatch.matchType;

        await addNickname(exerciseId, ex.originalName);
        await supabase
          .from("exercise_users")
          .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
      } else {
        // 2. Check AI similarity match
        const aiMatch = similarityMatches[ex.originalName];
        if (aiMatch) {
          const matched = exerciseByName.get(aiMatch.toLowerCase());
          if (matched) {
            exerciseId = matched.id;
            matchedName = matched.name;
            matchType = "ai_similarity";

            await addNickname(exerciseId, ex.originalName);
            await supabase
              .from("exercise_users")
              .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
          }
        }

        // 3. If still unmatched, check database case-insensitively
        if (!exerciseId) {
          const { data: existing } = await supabase
            .from("exercises")
            .select("id, name")
            .ilike("name", ex.originalName)
            .limit(1);

          if (existing && existing.length > 0) {
            exerciseId = existing[0].id;
            matchedName = existing[0].name;
            matchType = "ai_similarity";

            await supabase
              .from("exercise_users")
              .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });

            await addNickname(exerciseId, ex.originalName);
          } else {
            // 4. Create a brand new exercise using AI-generated metadata
            const meta = unmatchedMetadata[ex.originalName] ?? {};
            const newExercise = {
              name: meta.newExerciseName ?? ex.originalName,
              muscle_group: meta.muscleGroup ?? "full body",
              secondary_muscles: meta.secondaryMuscles ?? [],
              equipment: meta.equipment ?? "other",
              difficulty: meta.difficulty ?? "beginner",
              instructions: meta.instructions ?? "",
              gif_url: "",
              image_url: "Ingen bilde enda — kommer snart",
              images: [],
              is_custom: true,
              created_by: userId,
              nicknames: [ex.originalName.toLowerCase()],
            };

            const { data: inserted, error: insertErr } = await supabase
              .from("exercises")
              .insert(newExercise)
              .select("id, name")
              .single();

            if (insertErr || !inserted) {
              console.error("Failed to create new exercise:", insertErr);
              continue;
            }

            exerciseId = inserted.id;
            matchedName = inserted.name;
            matchType = "new";

            await supabase
              .from("exercise_users")
              .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
          }
        }
      }

      processedExercises.push({
        exerciseId,
        originalName: ex.originalName,
        matchedName,
        matchType,
        isNew: matchType === "new",
        sets: ex.sets ?? 3,
        reps: ex.reps ?? 10,
        weight: ex.weight ?? 0,
        rest: ex.rest ?? null,
        notes: ex.notes ?? null,
        muscleGroup: unmatchedMetadata[ex.originalName]?.muscleGroup ?? null,
        equipment: unmatchedMetadata[ex.originalName]?.equipment ?? null,
        difficulty: unmatchedMetadata[ex.originalName]?.difficulty ?? null,
      });
    }

    processedPlans.push({
      name: plan.name,
      dayLabel: plan.dayLabel,
      exercises: processedExercises,
    });
  }

  return processedPlans;
}

async function addNickname(exerciseId: string, nickname: string) {
  const normalized = nickname.toLowerCase().trim();
  if (!normalized) return;

  const { data: ex } = await supabase
    .from("exercises")
    .select("nicknames")
    .eq("id", exerciseId)
    .single();

  const current = (ex?.nicknames ?? []) as string[];
  if (current.includes(normalized)) return;

  await supabase
    .from("exercises")
    .update({ nicknames: [...current, normalized] })
    .eq("id", exerciseId);
}

// ===== Helpers =====

interface ProcessedExercise {
  exerciseId: string | null;
  originalName: string;
  matchedName: string | null;
  matchType: string;
  isNew: boolean;
  sets: number;
  reps: number;
  weight: number;
  rest: number | null;
  notes: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  difficulty: string | null;
}

interface ProcessedPlan {
  name: string;
  dayLabel: string;
  exercises: ProcessedExercise[];
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
