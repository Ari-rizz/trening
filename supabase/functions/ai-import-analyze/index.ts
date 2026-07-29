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

    // Fetch exercise names + nicknames for local matching
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, nicknames");

    if (exError) {
      console.error("Failed to fetch exercises:", exError);
      return jsonError("Failed to fetch exercise catalogue", 500);
    }

    // Build lookup maps for fast local matching
    const nameToId = new Map<string, string>();
    const nameToExerciseName = new Map<string, string>();

    for (const e of exercises ?? []) {
      const key = normalizeName(e.name);
      nameToId.set(key, e.id);
      nameToExerciseName.set(key, e.name);
      if (e.nicknames) {
        for (const nick of e.nicknames) {
          const nickKey = normalizeName(nick);
          nameToId.set(nickKey, e.id);
          nameToExerciseName.set(nickKey, e.name);
        }
      }
    }

    // Extract unique exercise names from the imported rows
    const uniqueNames = extractUniqueExerciseNames(rows);

    // Match each unique name locally
    const matchResults = new Map<string, LocalMatch>();
    const unmatchedNames: string[] = [];

    for (const name of uniqueNames) {
      const match = matchLocally(name, nameToId, nameToExerciseName);
      if (match) {
        matchResults.set(name, match);
      } else {
        unmatchedNames.push(name);
      }
    }

    // Call AI only for: plan grouping + metadata for unmatched exercises
    const aiResult = await callOpenAI(rows, unmatchedNames);

    if (!aiResult) {
      return jsonError("AI returnerte ingen gyldig respons. Prøv igjen.", 502);
    }

    // Merge AI plan grouping with local matching results
    const processedPlans = await processAiResult(aiResult.plans, matchResults, userId, nameToId);

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

interface LocalMatch {
  exerciseId: string;
  matchedName: string;
  matchType: "exact" | "nickname" | "normalized";
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
}

// ===== Local matching =====

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function matchLocally(
  name: string,
  nameToId: Map<string, string>,
  nameToExerciseName: Map<string, string>
): LocalMatch | null {
  const normalized = normalizeName(name);

  // Direct match on normalized name
  if (nameToId.has(normalized)) {
    return {
      exerciseId: nameToId.get(normalized)!,
      matchedName: nameToExerciseName.get(normalized)!,
      matchType: "exact",
    };
  }

  // Try without spaces (e.g. "benchpress" vs "bench press")
  const noSpaces = normalized.replace(/\s+/g, "");
  if (nameToId.has(noSpaces)) {
    return {
      exerciseId: nameToId.get(noSpaces)!,
      matchedName: nameToExerciseName.get(noSpaces)!,
      matchType: "normalized",
    };
  }

  // Try fuzzy prefix/contains matching for common variations
  // e.g. "benk" matches "benkpress", "knebøy" matches "knebøy"
  for (const [key, id] of nameToId) {
    const exName = nameToExerciseName.get(key)!;
    // If the input is a substring of a known name or vice versa (min 4 chars to avoid false positives)
    if (normalized.length >= 4) {
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
    // If no explicit exercise column found, use the first string column
    if (nameKeys.length === 0) {
      const firstString = Object.values(row).find(v => typeof v === "string" && v.trim());
      if (firstString && typeof firstString === "string") {
        names.add(firstString.trim());
      }
    }
  }
  return Array.from(names);
}

// ===== OpenAI call (small prompt — rows + unmatched names only) =====

async function callOpenAI(rows: RawRow[], unmatchedNames: string[]): Promise<AiResponse | null> {
  const systemPrompt = `You are a fitness expert assistant that analyzes workout program data imported from Excel/CSV files.
Your job is to:
1. Detect and group rows into separate training plans/sessions (e.g. "Dag A", "Dag B", "Push", "Pull", "Leg Day").
2. Collapse repeated identical sessions (e.g. "Uke 1 Dag A", "Uke 2 Dag A", "Uke 3 Dag A" with the same exercises) into ONE plan.
3. For each exercise in each plan, preserve the original name, sets, reps, weight, rest, and notes from the data.
4. For the list of unmatched exercise names, generate metadata: muscleGroup, secondaryMuscles, equipment, difficulty, instructions, and a normalized name.

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
- The unmatchedMetadata keys MUST exactly match the originalName values from the unmatched list.`;

  const unmatchedList = unmatchedNames.length > 0
    ? `Unmatched exercise names that need metadata:\n${unmatchedNames.join("\n")}`
    : "All exercises were matched. Leave unmatchedMetadata as an empty object.";

  const userMessage = `Here is the raw data from the imported file (JSON array of row objects):
${JSON.stringify(rows.slice(0, 500))}

${unmatchedList}

Analyze the data and return the structured JSON response.`;

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

// ===== Process AI result: merge local matches + AI metadata =====

async function processAiResult(
  plans: AiPlan[],
  matchResults: Map<string, LocalMatch>,
  userId: string,
  nameToId: Map<string, string>
) {
  const processedPlans = [];
  const unmatchedMetadata = (plans as unknown as AiResponse).unmatchedMetadata ?? {};

  for (const plan of plans) {
    const processedExercises = [];

    for (const ex of plan.exercises) {
      let exerciseId: string | null = null;
      let matchType: string = "new";
      let matchedName: string | null = null;

      // Check local match first
      const localMatch = matchResults.get(ex.originalName);
      if (localMatch) {
        exerciseId = localMatch.exerciseId;
        matchedName = localMatch.matchedName;
        matchType = localMatch.matchType;

        // Add nickname if the original name differs from the matched name
        await addNickname(exerciseId, ex.originalName);

        await supabase
          .from("exercise_users")
          .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
      } else {
        // No local match — check database case-insensitively
        const lookupName = ex.originalName;
        const { data: existing } = await supabase
          .from("exercises")
          .select("id, name")
          .ilike("name", lookupName)
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
          // Create a brand new exercise using AI-generated metadata
          const meta = unmatchedMetadata[ex.originalName] ?? {};
          const newExercise = {
            name: meta.newExerciseName ?? lookupName,
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

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
