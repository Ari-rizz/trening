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

    // Fetch exercise names + nicknames only (no UUIDs to keep prompt small)
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, nicknames");

    if (exError) {
      console.error("Failed to fetch exercises:", exError);
      return jsonError("Failed to fetch exercise catalogue", 500);
    }

    // Build a name-only list for the AI prompt — much smaller than full objects
    const exerciseNames: string[] = [];
    const nameToId = new Map<string, string>();

    for (const e of exercises ?? []) {
      nameToId.set(e.name.toLowerCase(), e.id);
      exerciseNames.push(e.name);
      if (e.nicknames) {
        for (const nick of e.nicknames) {
          nameToId.set(nick.toLowerCase(), e.id);
        }
      }
    }

    const aiResult = await callOpenAI(rows, exerciseNames);

    if (!aiResult) {
      return jsonError("AI returnerte ingen gyldig respons. Prøv igjen med færre øvelser.", 502);
    }

    // Process the AI result: resolve exercise names to IDs, create new ones, add nicknames
    const processedPlans = await processAiResult(aiResult.plans, userId, nameToId);

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

interface AiExercise {
  originalName: string;
  matchedExerciseName?: string | null;
  matchType: "exact" | "nickname" | "ai_similarity" | "new";
  isNew: boolean;
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

// ===== OpenAI call =====

async function callOpenAI(rows: RawRow[], exerciseNames: string[]): Promise<{ plans: AiPlan[] } | null> {
  const systemPrompt = `You are a fitness expert assistant that analyzes workout program data imported from Excel/CSV files.
Your job is to:
1. Detect and group rows into separate training plans/sessions (e.g. "Dag A", "Dag B", "Push", "Pull", "Leg Day").
2. Collapse repeated identical sessions (e.g. "Uke 1 Dag A", "Uke 2 Dag A", "Uke 3 Dag A" with the same exercises) into ONE plan.
3. For each exercise name, try to match it to an existing exercise from the provided list by name or nickname (case-insensitive, fuzzy matching for Norwegian/English variations).
4. For exercises that don't match anything in the list, flag them as new and generate: muscleGroup, secondaryMuscles, equipment, difficulty, instructions, and a normalized name.

You must respond with a JSON object matching this exact structure:
{
  "plans": [
    {
      "name": "string - the plan name (e.g. 'Dag A', 'Push Day')",
      "dayLabel": "string - a short label for the session (e.g. 'Dag A', 'Økt 1')",
      "exercises": [
        {
          "originalName": "string - the exercise name as it appeared in the file",
          "matchedExerciseName": "string | null - the matched exercise name from the list, or null if new",
          "matchType": "'exact' | 'nickname' | 'ai_similarity' | 'new'",
          "isNew": boolean,
          "sets": number,
          "reps": number,
          "weight": number,
          "rest": number | null,
          "notes": "string | null",
          "newExerciseName": "string | null - normalized name for new exercises",
          "muscleGroup": "string | null",
          "secondaryMuscles": "string[] | null",
          "equipment": "string | null",
          "difficulty": "string | null",
          "instructions": "string | null"
        }
      ]
    }
  ]
}

Rules:
- If the file has multiple sheets or sections that look like separate training days, create multiple plans.
- If the same day/session is repeated across weeks with identical exercises, collapse into one plan.
- Match exercises generously — "benk", "benkpress", "bench press", "flat bench" should all match the closest exercise in the list.
- For new exercises, use these muscleGroup values: chest, back, shoulders, biceps, triceps, legs, abs, glutes, forearms, full body, cardio.
- For equipment use: barbell, dumbbell, cable, machine, bodyweight, kettlebell, resistance band, other.
- For difficulty use: beginner, intermediate, advanced.
- Always respond in the same language as the input (Norwegian or English).
- Keep instructions concise (1-2 sentences).
- If sets/reps/weight are missing or invalid, default to 3 sets, 10 reps, 0 weight.
- IMPORTANT: For matchedExerciseName, use the EXACT name from the exercise list. Do not invent names.`;

  // Send only exercise names as a newline-separated list — much smaller than JSON objects
  const namesList = exerciseNames.slice(0, 2000).join("\n");

  const userMessage = `Here is the raw data from the imported file (JSON array of row objects):
${JSON.stringify(rows.slice(0, 300))}

Here is the list of known exercise names to match against (one per line):
${namesList}

Analyze the data and return the structured JSON response.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

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

    const parsed = JSON.parse(content);
    if (!parsed.plans || !Array.isArray(parsed.plans)) {
      console.error("OpenAI returned invalid structure:", content.slice(0, 500));
      return null;
    }

    return parsed;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("OpenAI call timed out");
      throw new Error("AI-analyse tidsavbrutt (over 120 sekunder). Prøv med færre øvelser.");
    }
    throw err;
  }
}

// ===== Process AI result: resolve names to IDs, create new exercises =====

async function processAiResult(plans: AiPlan[], userId: string, nameToId: Map<string, string>) {
  const processedPlans = [];

  for (const plan of plans) {
    const processedExercises = [];

    for (const ex of plan.exercises) {
      let exerciseId: string | null = null;
      let matchType = ex.matchType;
      let matchedName: string | null = null;

      // Try to resolve the matched name to an ID
      if (ex.matchedExerciseName) {
        const lookupKey = ex.matchedExerciseName.toLowerCase();
        exerciseId = nameToId.get(lookupKey) ?? null;
      }

      if (exerciseId) {
        // Successfully resolved to an existing exercise
        matchedName = ex.matchedExerciseName;
        matchType = ex.matchType === "new" ? "ai_similarity" : ex.matchType;

        // Add nickname if the original name differs
        await addNickname(exerciseId, ex.originalName);

        // Add this user to exercise_users
        await supabase
          .from("exercise_users")
          .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
      } else {
        // No match — check if an exercise with this name already exists (case-insensitive)
        const lookupName = ex.newExerciseName ?? ex.originalName;
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
          // Create a brand new private exercise
          const newExercise = {
            name: lookupName,
            muscle_group: ex.muscleGroup ?? "full body",
            secondary_muscles: ex.secondaryMuscles ?? [],
            equipment: ex.equipment ?? "other",
            difficulty: ex.difficulty ?? "beginner",
            instructions: ex.instructions ?? "",
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
        muscleGroup: ex.muscleGroup ?? null,
        equipment: ex.equipment ?? null,
        difficulty: ex.difficulty ?? null,
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
