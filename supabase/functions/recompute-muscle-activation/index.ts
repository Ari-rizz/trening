import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegionMapping {
  region: string;
  intensity: number;
}

const DEFAULT_SPLITS: Record<string, RegionMapping[]> = {
  chest: [{ region: "chest_middle", intensity: 1 }],
  shoulders: [{ region: "shoulders_front", intensity: 0.5 }, { region: "shoulders_side", intensity: 0.5 }],
  back: [{ region: "back_lats", intensity: 0.5 }, { region: "back_upper", intensity: 0.3 }, { region: "back_lower", intensity: 0.2 }],
  biceps: [{ region: "biceps", intensity: 1 }],
  triceps: [{ region: "triceps", intensity: 1 }],
  legs: [{ region: "legs_quads", intensity: 0.5 }, { region: "legs_hams", intensity: 0.3 }, { region: "legs_glutes", intensity: 0.2 }],
  abs: [{ region: "abs", intensity: 1 }],
  glutes: [{ region: "legs_glutes", intensity: 0.8 }, { region: "legs_hams", intensity: 0.2 }],
  forearms: [{ region: "forearms", intensity: 1 }],
  calves: [{ region: "legs_calves", intensity: 1 }],
};

interface NameRule {
  match: (name: string) => boolean;
  splits: RegionMapping[];
}

const NAME_RULES: NameRule[] = [
  { match: n => /incline/i.test(n), splits: [{ region: "chest_upper", intensity: 1 }] },
  { match: n => /decline/i.test(n), splits: [{ region: "chest_lower", intensity: 1 }] },
  { match: n => /pullover/i.test(n), splits: [{ region: "chest_upper", intensity: 0.7 }, { region: "back_lats", intensity: 0.3 }] },
  { match: n => /lateral raise|side raise/i.test(n), splits: [{ region: "shoulders_side", intensity: 1 }] },
  { match: n => /front raise/i.test(n), splits: [{ region: "shoulders_front", intensity: 1 }] },
  { match: n => /rear delt|face pull|bent.over.*raise|reverse fly|back fly/i.test(n), splits: [{ region: "shoulders_rear", intensity: 1 }] },
  { match: n => /arnold press/i.test(n), splits: [{ region: "shoulders_front", intensity: 0.5 }, { region: "shoulders_side", intensity: 0.5 }] },
  { match: n => /shoulder press|military press|overhead press/i.test(n), splits: [{ region: "shoulders_front", intensity: 0.7 }, { region: "shoulders_side", intensity: 0.3 }] },
  { match: n => /upright row/i.test(n), splits: [{ region: "shoulders_side", intensity: 0.6 }, { region: "back_upper", intensity: 0.4 }] },
  { match: n => /pull.?up|chin.?up|lat pulldown|pulldown/i.test(n), splits: [{ region: "back_lats", intensity: 0.8 }, { region: "back_upper", intensity: 0.2 }] },
  { match: n => /barbell row|bent over row|dumbbell row|row\b/i.test(n) && !/upright/i.test(n), splits: [{ region: "back_upper", intensity: 0.5 }, { region: "back_lats", intensity: 0.5 }] },
  { match: n => /seated row|cable row|close grip row/i.test(n), splits: [{ region: "back_lats", intensity: 0.5 }, { region: "back_upper", intensity: 0.5 }] },
  { match: n => /deadlift|romanian|rdl|stiff.leg/i.test(n), splits: [{ region: "back_lower", intensity: 0.4 }, { region: "legs_hams", intensity: 0.4 }, { region: "legs_glutes", intensity: 0.2 }] },
  { match: n => /good morning|hyperextension|back extension/i.test(n), splits: [{ region: "back_lower", intensity: 0.6 }, { region: "legs_hams", intensity: 0.4 }] },
  { match: n => /shrug/i.test(n), splits: [{ region: "back_upper", intensity: 1 }] },
  { match: n => /squat|leg press|hack squat|leg extension|lunge|split squat|goblet/i.test(n), splits: [{ region: "legs_quads", intensity: 0.7 }, { region: "legs_glutes", intensity: 0.3 }] },
  { match: n => /leg curl|hamstring curl/i.test(n), splits: [{ region: "legs_hams", intensity: 1 }] },
  { match: n => /hip thrust|glute bridge|hip raise|cable kick|glute kick/i.test(n), splits: [{ region: "legs_glutes", intensity: 1 }] },
  { match: n => /calf raise|calf press|seated calf/i.test(n), splits: [{ region: "legs_calves", intensity: 1 }] },
  { match: n => /adductor|groin|inner thigh/i.test(n), splits: [{ region: "legs_quads", intensity: 0.5 }, { region: "legs_glutes", intensity: 0.5 }] },
  { match: n => /leg raise|leg lift|captain|toe touch|crunch|sit.up|hanging/i.test(n), splits: [{ region: "abs", intensity: 1 }] },
  { match: n => /plank|side plank|ab wheel|ab roller/i.test(n), splits: [{ region: "abs", intensity: 1 }] },
  { match: n => /hammer curl|preacher curl|concentration curl|curl\b/i.test(n), splits: [{ region: "biceps", intensity: 1 }] },
  { match: n => /tricep pushdown|skull crusher|overhead extension|tricep extension|kickback|dip\b/i.test(n), splits: [{ region: "triceps", intensity: 1 }] },
  { match: n => /wrist curl|reverse curl|farmer|grip/i.test(n), splits: [{ region: "forearms", intensity: 1 }] },
];

function getRegionsForExercise(muscleGroup: string, exerciseName: string): RegionMapping[] {
  const name = (exerciseName ?? "").toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.match(name)) return rule.splits;
  }
  return DEFAULT_SPLITS[muscleGroup] ?? [{ region: muscleGroup, intensity: 1 }];
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

    const userFilter = targetUserId ? `.eq("user_id", "${targetUserId}")` : "";

    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select(`
        id,
        user_id,
        workout_exercises(
          exercise_id,
          exercises(id, name, muscle_group, secondary_muscles),
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

    // Group workouts by user
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
      // Delete existing activation rows for this user
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
          const regions = getRegionsForExercise(ex.muscle_group, ex.name ?? "");

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
