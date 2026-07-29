import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AliasInput {
  exerciseId: string;
  alias: string;
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9æøå ]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Require a valid signed-in user (the alias is learned from their confirmed import).
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Ikke autorisert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const aliases: AliasInput[] = Array.isArray(body.aliases) ? body.aliases : [];
    if (aliases.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group requested aliases per exercise.
    const byExercise = new Map<string, Set<string>>();
    for (const a of aliases) {
      if (!a?.exerciseId || !a?.alias) continue;
      const clean = normalize(a.alias);
      if (!clean) continue;
      if (!byExercise.has(a.exerciseId)) byExercise.set(a.exerciseId, new Set());
      byExercise.get(a.exerciseId)!.add(clean);
    }

    const exerciseIds = Array.from(byExercise.keys());
    if (exerciseIds.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error: fetchError } = await admin
      .from("exercises")
      .select("id, name, nicknames")
      .in("id", exerciseIds);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    for (const row of rows ?? []) {
      const requested = byExercise.get(row.id);
      if (!requested) continue;

      const existing: string[] = Array.isArray(row.nicknames) ? row.nicknames : [];
      const existingNorm = new Set(existing.map(normalize));
      const selfNorm = normalize(row.name ?? "");

      const toAdd: string[] = [];
      for (const alias of requested) {
        if (!alias || alias === selfNorm) continue;
        if (existingNorm.has(alias)) continue;
        existingNorm.add(alias);
        toAdd.push(alias);
      }

      if (toAdd.length === 0) continue;

      const { error: updateError } = await admin
        .from("exercises")
        .update({ nicknames: [...existing, ...toAdd] })
        .eq("id", row.id);

      if (!updateError) updated += toAdd.length;
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
