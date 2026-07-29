import { supabase } from './supabase';

export interface AnalyzedExercise {
  exerciseId: string | null;
  originalName: string;
  matchedName: string | null;
  matchType: 'exact' | 'nickname' | 'normalized' | 'ai_similarity' | 'new';
  isNew: boolean;
  isNonExercise: boolean;
  sets: number;
  reps: number;
  weight: number;
  rest: number | null;
  notes: string | null;
  newExerciseName: string | null;
  muscleGroup: string | null;
  secondaryMuscles: string[] | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
}

export interface AnalyzedPlan {
  name: string;
  dayLabel: string;
  exercises: AnalyzedExercise[];
}

export interface AnalysisResult {
  plans: AnalyzedPlan[];
}

export async function analyzeImport(
  rawRows: Record<string, string | number>[],
  userId: string
): Promise<AnalysisResult> {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;

  if (!accessToken) {
    throw new Error('Du må være innlogget for å importere');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-import-analyze`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ rows: rawRows, userId }),
    }
  );

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Analyse feilet (${response.status})`);
  }

  const data = await response.json();
  if (!data.plans || !Array.isArray(data.plans)) {
    throw new Error(data.error ?? 'Ugyldig respons fra AI-analyse');
  }

  return { plans: data.plans };
}

export async function saveConfirmedPlans(
  plans: AnalyzedPlan[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const plansToSave = plans.filter(p => p.exercises.length > 0);
  if (plansToSave.length === 0) return { success: false, error: 'Ingen planer å lagre' };

  // Cache newly created exercises so the same name isn't created twice across plans
  const createdCache = new Map<string, string>();
  // Every exercise the user keeps (new or matched) is registered as "used" so the
  // shared library can promote a private exercise to public once 5 users have it.
  const usedExerciseIds = new Set<string>();

  const resolveExerciseId = async (ex: AnalyzedExercise): Promise<string | null> => {
    if (ex.exerciseId) return ex.exerciseId;

    const cacheKey = ex.originalName.trim().toLowerCase();
    const cached = createdCache.get(cacheKey);
    if (cached) return cached;

    const { data: created, error: createError } = await supabase
      .from('exercises')
      .insert({
        name: ex.newExerciseName?.trim() || ex.originalName.trim(),
        muscle_group: ex.muscleGroup ?? 'full body',
        secondary_muscles: ex.secondaryMuscles ?? [],
        equipment: ex.equipment ?? 'other',
        difficulty: ex.difficulty ?? 'beginner',
        instructions: ex.instructions ?? '',
        is_custom: true,
        created_by: userId,
        nicknames: [cacheKey],
      })
      .select('id')
      .maybeSingle();

    if (createError || !created) return null;
    createdCache.set(cacheKey, created.id);
    return created.id;
  };

  for (const plan of plansToSave) {
    const resolved: Array<{ ex: AnalyzedExercise; exerciseId: string }> = [];
    for (const ex of plan.exercises) {
      const exerciseId = await resolveExerciseId(ex);
      if (!exerciseId) {
        return { success: false, error: 'Kunne ikke opprette en av øvelsene' };
      }
      usedExerciseIds.add(exerciseId);
      resolved.push({ ex, exerciseId });
    }

    const { data: template, error: tmplError } = await supabase
      .from('workout_templates')
      .insert({
        user_id: userId,
        name: plan.name || 'Importert plan',
        description: `Importert ${new Date().toLocaleDateString('nb-NO')}`,
      })
      .select('id')
      .single();

    if (tmplError || !template) {
      return { success: false, error: 'Kunne ikke opprette plan' };
    }

    const exercisesToInsert = resolved.map(({ ex, exerciseId }, idx) => ({
      template_id: template.id,
      exercise_id: exerciseId,
      order_index: idx,
      target_sets: ex.sets,
      target_reps: ex.reps,
      target_weight_kg: ex.weight,
      notes: ex.notes ?? '',
      warmup_sets: 0,
      is_unilateral: false,
      superset_group: null,
    }));

    const { error: insertError } = await supabase
      .from('template_exercises')
      .insert(exercisesToInsert);

    if (insertError) {
      return { success: false, error: 'Kunne ikke lagre øvelsene' };
    }
  }

  if (usedExerciseIds.size > 0) {
    await supabase
      .from('exercise_users')
      .upsert(
        Array.from(usedExerciseIds).map(exercise_id => ({ exercise_id, user_id: userId })),
        { onConflict: 'exercise_id,user_id' },
      );
  }

  return { success: true };
}
