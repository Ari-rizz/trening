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

// ── body_part → region mapping ──────────────────────────────────────────────
const BODY_PART_TO_REGION: Record<string, string> = {
  "chest": "chest_middle",
  "shoulders": "shoulders_front",
  "lats": "back_lats",
  "middle back": "back_upper",
  "lower back": "back_lower",
  "traps": "back_upper",
  "neck": "back_upper",
  "biceps": "biceps",
  "triceps": "triceps",
  "forearms": "forearms",
  "quadriceps": "legs_quads",
  "hamstrings": "legs_hams",
  "calves": "legs_calves",
  "glutes": "legs_glutes",
  "adductors": "legs_quads",
  "abductors": "legs_glutes",
  "abdominals": "abs",
};

const MUSCLE_GROUP_TO_REGION: Record<string, string> = {
  "chest": "chest_middle",
  "shoulders": "shoulders_front",
  "back": "back_lats",
  "biceps": "biceps",
  "triceps": "triceps",
  "forearms": "forearms",
  "legs": "legs_quads",
  "abs": "abs",
  "glutes": "legs_glutes",
};

const SECONDARY_TO_REGION: Record<string, string> = {
  "chest": "chest_middle",
  "shoulders": "shoulders_front",
  "back": "back_lats",
  "biceps": "biceps",
  "triceps": "triceps",
  "forearms": "forearms",
  "abs": "abs",
  "glutes": "legs_glutes",
};

interface NameRule {
  match: (name: string) => boolean;
  splits: RegionSplit[];
}

const NAME_RULES: NameRule[] = [
  // Chest sub-regions
  { match: n => /incline/i.test(n), splits: [{ region: "chest_upper", intensity: 1 }] },
  { match: n => /decline/i.test(n), splits: [{ region: "chest_lower", intensity: 1 }] },
  { match: n => /pullover/i.test(n), splits: [{ region: "chest_upper", intensity: 0.7 }, { region: "back_lats", intensity: 0.3 }] },
  // Shoulder sub-regions
  { match: n => /lateral raise|side raise|lateral front raise/i.test(n), splits: [{ region: "shoulders_side", intensity: 1 }] },
  { match: n => /front raise/i.test(n), splits: [{ region: "shoulders_front", intensity: 1 }] },
  { match: n => /rear delt|face pull|bent.over.*raise|reverse fly|reverse pec|back fly/i.test(n), splits: [{ region: "shoulders_rear", intensity: 1 }] },
  { match: n => /arnold press/i.test(n), splits: [{ region: "shoulders_front", intensity: 0.5 }, { region: "shoulders_side", intensity: 0.5 }] },
  { match: n => /shoulder press|military press|overhead press/i.test(n), splits: [{ region: "shoulders_front", intensity: 0.7 }, { region: "shoulders_side", intensity: 0.3 }] },
  { match: n => /upright row/i.test(n), splits: [{ region: "shoulders_side", intensity: 0.6 }, { region: "back_upper", intensity: 0.4 }] },
  // Back sub-regions
  { match: n => /pull.?up|chin.?up|lat pulldown|pulldown/i.test(n), splits: [{ region: "back_lats", intensity: 0.8 }, { region: "back_upper", intensity: 0.2 }] },
  { match: n => /barbell row|bent over row|dumbbell row|row\b/i.test(n) && !/upright/i.test(n), splits: [{ region: "back_upper", intensity: 0.5 }, { region: "back_lats", intensity: 0.5 }] },
  { match: n => /seated row|cable row|close grip row/i.test(n), splits: [{ region: "back_lats", intensity: 0.5 }, { region: "back_upper", intensity: 0.5 }] },
  { match: n => /deadlift|romanian|rdl|stiff.leg/i.test(n), splits: [{ region: "back_lower", intensity: 0.4 }, { region: "legs_hams", intensity: 0.4 }, { region: "legs_glutes", intensity: 0.2 }] },
  { match: n => /good morning|hyperextension|back extension/i.test(n), splits: [{ region: "back_lower", intensity: 0.6 }, { region: "legs_hams", intensity: 0.4 }] },
  { match: n => /shrug/i.test(n), splits: [{ region: "back_upper", intensity: 1 }] },
  // Legs sub-regions
  { match: n => /squat|leg press|hack squat|leg extension|lunge|split squat|goblet/i.test(n), splits: [{ region: "legs_quads", intensity: 0.7 }, { region: "legs_glutes", intensity: 0.3 }] },
  { match: n => /leg curl|hamstring curl/i.test(n), splits: [{ region: "legs_hams", intensity: 1 }] },
  { match: n => /hip thrust|glute bridge|hip raise|cable kick|glute kick/i.test(n), splits: [{ region: "legs_glutes", intensity: 1 }] },
  { match: n => /calf raise|calf press|seated calf/i.test(n), splits: [{ region: "legs_calves", intensity: 1 }] },
  { match: n => /adductor|groin|inner thigh/i.test(n), splits: [{ region: "legs_quads", intensity: 0.5 }, { region: "legs_glutes", intensity: 0.5 }] },
  // Abs
  { match: n => /leg raise|leg lift|captain|toe touch|crunch|sit.up|hanging/i.test(n), splits: [{ region: "abs", intensity: 1 }] },
  { match: n => /plank|side plank|ab wheel|ab roller/i.test(n), splits: [{ region: "abs", intensity: 1 }] },
  // Arms (biceps)
  { match: n => /hammer curl|preacher curl|concentration curl|curl\b/i.test(n), splits: [{ region: "biceps", intensity: 1 }] },
  // Arms (triceps) — only match actual triceps dips, not "jerk dip" or "chest dips"
  { match: n => /tricep pushdown|skull crusher|overhead extension|tricep extension|kickback/i.test(n), splits: [{ region: "triceps", intensity: 1 }] },
  { match: n => /^(dips?|dips?\b.*triceps?|triceps?.*dips?)/i.test(n) && !/jerk dip|chest version/i.test(n), splits: [{ region: "triceps", intensity: 1 }] },
  // Forearms — only actual forearm exercises, not grip positions
  { match: n => /wrist curl|reverse curl|farmer|grip trainer|grip strength|hand gripper/i.test(n), splits: [{ region: "forearms", intensity: 1 }] },
];

function computeActivationRegions(
  name: string,
  muscleGroup: string,
  bodyPart: string,
  secondaryMuscles: string[],
): RegionSplit[] {
  const lowerName = (name ?? "").toLowerCase();

  for (const rule of NAME_RULES) {
    if (rule.match(lowerName)) {
      return rule.splits;
    }
  }

  const primaryRegion = BODY_PART_TO_REGION[bodyPart] ?? MUSCLE_GROUP_TO_REGION[muscleGroup] ?? muscleGroup;

  const secondaryRegions: string[] = [];
  const seen = new Set<string>([primaryRegion]);
  for (const sm of secondaryMuscles ?? []) {
    const region = SECONDARY_TO_REGION[sm];
    if (region && !seen.has(region)) {
      seen.add(region);
      secondaryRegions.push(region);
    }
  }

  if (secondaryRegions.length === 0) {
    return [{ region: primaryRegion, intensity: 1 }];
  }

  const secondaryIntensity = 0.2 / secondaryRegions.length;
  return [
    { region: primaryRegion, intensity: 0.8 },
    ...secondaryRegions.map(r => ({ region: r, intensity: Math.round(secondaryIntensity * 100) / 100 })),
  ];
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

    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("id, name, muscle_group, body_part, secondary_muscles")
      .order("name", { ascending: true });

    if (error) throw error;
    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const chunkSize = 500;
    const updates: any[] = [];

    for (const ex of exercises) {
      const regions = computeActivationRegions(
        ex.name,
        ex.muscle_group,
        ex.body_part,
        ex.secondary_muscles ?? [],
      );
      updates.push({ id: ex.id, activation_regions: regions });
    }

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const { error: updateError } = await supabase
        .from("exercises")
        .upsert(chunk, { onConflict: "id" });
      if (updateError) {
        console.error("Update error:", updateError.message);
      } else {
        processed += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, total: exercises.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
