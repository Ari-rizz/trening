import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const muscleMap: Record<string, string> = {
  "abdominals": "abs", "abductors": "legs", "adductors": "legs", "biceps": "biceps",
  "calves": "legs", "chest": "chest", "forearms": "forearms", "glutes": "glutes",
  "hamstrings": "legs", "hip flexors": "legs", "it band": "legs", "infraspinatus": "shoulders",
  "lats": "back", "lower back": "back", "middle back": "back", "neck": "back",
  "obliques": "abs", "piriformis": "glutes", "quadriceps": "legs", "rhomboids": "back",
  "rotator cuff": "shoulders", "sartorius": "legs", "shoulders": "shoulders", "soleus": "legs",
  "supraspinatus": "shoulders", "traps": "back", "triceps": "triceps", "upper back": "back",
};

const equipmentMap: Record<string, string> = {
  "barbell": "barbell", "dumbbell": "dumbbell", "cable": "cable", "machine": "machine",
  "body only": "bodyweight", "kettlebells": "kettlebell", "bands": "resistance band",
  "e-z curl bar": "barbell", "exercise ball": "other", "foam roll": "other",
  "medicine ball": "other", "other": "other",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch exercise data from free-exercise-db
    const res = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
    if (!res.ok) throw new Error("Failed to fetch exercises: " + res.status);
    const exercises: any[] = await res.json();

    const rows = exercises.map((ex) => ({
      name: ex.name,
      muscle_group: muscleMap[(ex.primaryMuscles?.[0] ?? "").toLowerCase()] ?? "full body",
      secondary_muscles: (ex.secondaryMuscles ?? [])
        .map((m: string) => muscleMap[m.toLowerCase()] ?? m)
        .filter(Boolean),
      equipment: equipmentMap[(ex.equipment ?? "").toLowerCase()] ?? "other",
      difficulty: ex.level === "intermediate" ? "intermediate" : ex.level === "expert" ? "advanced" : "beginner",
      instructions: Array.isArray(ex.instructions) ? ex.instructions.join(" ") : (ex.instructions ?? ""),
      gif_url: ex.images?.[1] ? IMAGE_BASE + ex.images[1] : "",
      image_url: ex.images?.[0] ? IMAGE_BASE + ex.images[0] : "",
      images: (ex.images ?? []).map((img: string) => IMAGE_BASE + img),
      source_id: ex.id,
      body_part: ex.primaryMuscles?.[0] ?? "",
      force: ex.force ?? "",
      mechanic: ex.mechanic ?? "",
      category: ex.category ?? "",
      is_custom: false,
    }));

    // Batch upsert in chunks of 100
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("exercises")
        .upsert(batch, { onConflict: "source_id" });
      if (error) throw new Error("Upsert error at row " + i + ": " + error.message);
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, total: rows.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
