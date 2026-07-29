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

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY secret is not configured");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  try {
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

    // Fetch the full exercise catalogue (names + nicknames) to give the AI
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, nicknames, is_custom, created_by");

    if (exError) {
      console.error("Failed to fetch exercises:", exError);
      return jsonError("Failed to fetch exercise catalogue", 500);
    }

    // Build a compact catalogue for the AI prompt
    const catalogue = (exercises ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      muscle_group: e.muscle_group,
      equipment: e.equipment,
      nicknames: e.nicknames ?? [],
    }));

    const aiResult = await callOpenAI(rows, catalogue);

    if (!aiResult) {
      return jsonError("AI analysis failed — please try again", 502);
    }

    // Process the AI result: resolve exercises, create new ones, add nicknames
    const processedPlans = await processAiResult(aiResult.plans, userId);

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
  matchedExerciseId?: string;
  matchedExerciseName?: string;
  matchType: "exact" | "nickname" | "ai_similarity" | "new";
  isNew: boolean;
  sets: number;
  reps: number;
  weight: number;
  rest?: number;
  notes?: string;
  // For new exercises:
  newExerciseName?: string;
  muscleGroup?: string;
  secondaryMuscles?: string[];
  equipment?: string;
  difficulty?: string;
  instructions?: string;
}

interface AiPlan {
  name: string;
  dayLabel: string;
  exercises: AiExercise[];
}

// ===== OpenAI call =====

async function callOpenAI(rows: RawRow[], catalogue: any[]): Promise<{ plans: AiPlan[] } | null> {
  const systemPrompt = `You are a fitness expert assistant that analyzes workout program data imported from Excel/CSV files.
Your job is to:
1. Detect and group rows into separate training plans/sessions (e.g. "Dag A", "Dag B", "Push", "Pull", "Leg Day").
2. Collapse repeated identical sessions (e.g. "Uke 1 Dag A", "Uke 2 Dag A", "Uke 3 Dag A" with the same exercises) into ONE plan.
3. For each exercise name, try to match it to an existing exercise from the provided catalogue by name or nickname (case-insensitive, fuzzy matching for Norwegian/English variations).
4. For exercises that don't match anything in the catalogue, flag them as new and generate: muscleGroup, secondaryMuscles, equipment, difficulty, instructions, and a normalized name.

You must respond with a JSON object matching this exact structure:
{
  "plans": [
    {
      "name": "string - the plan name (e.g. 'Dag A', 'Push Day')",
      "dayLabel": "string - a short label for the session (e.g. 'Dag A', 'Økt 1')",
      "exercises": [
        {
          "originalName": "string - the exercise name as it appeared in the file",
          "matchedExerciseId": "string | null - the UUID of the matched exercise, or null if new",
          "matchedExerciseName": "string | null - the name of the matched exercise",
          "matchType": "'exact' | 'nickname' | 'ai_similarity' | 'new'",
          "isNew": boolean,
          "sets": number,
          "reps": number,
          "weight": number,
          "rest": number | null,
          "notes": "string | null",
          "newExerciseName": "string | null - normalized name for new exercises",
          "muscleGroup": "string | null - for new exercises",
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
- Match exercises generously — "benk", "benkpress", "bench press", "flat bench" should all match "Barbell Bench Press - Medium Grip" if it exists in the catalogue.
- For new exercises, use these muscleGroup values: chest, back, shoulders, biceps, triceps, legs, abs, glutes, forearms, full body, cardio.
- For equipment use: barbell, dumbbell, cable, machine, bodyweight, kettlebell, resistance band, other.
- For difficulty use: beginner, intermediate, advanced.
- Always respond in the same language as the input (Norwegian or English).
- Keep instructions concise (1-2 sentences).
- If sets/reps/weight are missing or invalid, default to 3 sets, 10 reps, 0 weight.`;

  const userMessage = `Here is the raw data from the imported file (JSON array of row objects):
${JSON.stringify(rows.slice(0, 500))}

Here is the exercise catalogue to match against:
${JSON.stringify(catalogue.slice(0, 2000))}

Analyze the data and return the structured JSON response.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!parsed.plans || !Array.isArray(parsed.plans)) return null;

    return parsed;
  } catch (err) {
    console.error("OpenAI call failed:", err);
    return null;
  }
}

// ===== Process AI result: create new exercises, add nicknames, track users =====

async function processAiResult(plans: AiPlan[], userId: string) {
  const processedPlans = [];

  for (const plan of plans) {
    const processedExercises = [];

    for (const ex of plan.exercises) {
      let exerciseId: string | null = null;
      let matchType = ex.matchType;
      let matchedName: string | null = null;

      if (ex.isNew || !ex.matchedExerciseId) {
        // Check if another user already created this exercise with the same normalized name
        const { data: existing } = await supabase
          .from("exercises")
          .select("id, name, is_custom, created_by")
          .ilike("name", ex.newExerciseName ?? ex.originalName)
          .limit(1);

        if (existing && existing.length > 0) {
          // Found an existing exercise with the same name (possibly created by another user)
          exerciseId = existing[0].id;
          matchedName = existing[0].name;
          matchType = "ai_similarity";

          // Add this user to exercise_users if not already there
          await supabase
            .from("exercise_users")
            .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });

          // Add nickname if the original name differs
          await addNickname(exerciseId, ex.originalName);
        } else {
          // Create a brand new private exercise
          const newExercise = {
            name: ex.newExerciseName ?? ex.originalName,
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

          // Add to exercise_users
          await supabase
            .from("exercise_users")
            .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
        }
      } else {
        // Matched to an existing exercise by the AI
        exerciseId = ex.matchedExerciseId;
        matchedName = ex.matchedExerciseName ?? ex.originalName;

        // Add nickname if the original name is not already there
        await addNickname(exerciseId, ex.originalName);

        // Add this user to exercise_users
        await supabase
          .from("exercise_users")
          .upsert({ exercise_id: exerciseId, user_id: userId }, { onConflict: "exercise_id, user_id" });
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
