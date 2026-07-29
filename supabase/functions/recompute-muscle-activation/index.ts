import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegionSplit {
  region: string;
  intensity: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let targetUserId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetUserId = body.user_id ?? null;
      } catch {
        // empty body is fine — process all users
      }
    }

    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select(`
        id,
        user_id,
        workout_exercises(
          exercise_id,
          exercises(id, name, muscle_group, activation_regions),
          workout_sets(weight_kg, reps, is_completed)
        )
      `)
      .eq("is_completed", true)
      .order("date", { ascending: true });

    if (wError) throw wError;
    if (!workouts || workouts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, rows: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const byUser = new Map<string, any[]>();
    for (const w of workouts) {
      const uid = (w as any).user_id;
      if (targetUserId && uid !== targetUserId) continue;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(w);
    }

    let totalRows = 0;
    let processedUsers = 0;

    for (const [userId, userWorkouts] of byUser) {
      await supabase.from("muscle_activation").delete().eq("user_id", userId);

      const rows: any[] = [];

      for (const workout of userWorkouts) {
        for (const we of (workout as any).workout_exercises ?? []) {
          const ex = we.exercises;
          if (!ex) continue;
          const completedSets = (we.workout_sets ?? []).filter((s: any) => s.is_completed);
          if (completedSets.length === 0) continue;

          const volume = completedSets.reduce(
            (a: number, s: any) => a + (Number(s.weight_kg) ?? 0) * (Number(s.reps) ?? 0),
            0
          );

          // Read activation_regions directly from the exercise row
          const regions: RegionSplit[] = (ex.activation_regions ?? []) as RegionSplit[];
          if (regions.length === 0) continue;

          for (const { region, intensity } of regions) {
            rows.push({
              user_id: userId,
              workout_id: workout.id,
              exercise_id: ex.id,
              region,
              sets: Math.round(completedSets.length * intensity * 10) / 10,
              volume_kg: Math.round(volume * intensity),
              intensity_score: Math.round(intensity * 100),
            });
          }
        }
      }

      if (rows.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const { error: insertError } = await supabase
            .from("muscle_activation")
            .insert(rows.slice(i, i + chunkSize));
          if (insertError) {
            console.error(`Insert error for user ${userId}:`, insertError.message);
          }
        }
        totalRows += rows.length;
      }
      processedUsers++;
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedUsers, rows: totalRows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
