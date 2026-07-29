import { supabase } from './supabase';

export interface AnalyzedExercise {
  exerciseId: string;
  originalName: string;
  matchedName: string | null;
  matchType: 'exact' | 'nickname' | 'ai_similarity' | 'new';
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
    throw new Error('Ugyldig respons fra AI-analyse');
  }

  return { plans: data.plans };
}

export async function saveConfirmedPlans(
  plans: AnalyzedPlan[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const plansToSave = plans.filter(p => p.exercises.length > 0);
  if (plansToSave.length === 0) return { success: false, error: 'Ingen planer å lagre' };

  for (const plan of plansToSave) {
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

    const exercisesToInsert = plan.exercises.map((ex, idx) => ({
      template_id: template.id,
      exercise_id: ex.exerciseId,
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

  return { success: true };
}
