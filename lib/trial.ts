import { supabase } from './supabase';

const TRIAL_DAYS = 30;

export async function startTrial(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_starts_at, trial_ends_at')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.trial_starts_at) return;

  const now = new Date();
  const ends = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await supabase
    .from('profiles')
    .update({
      trial_starts_at: now.toISOString(),
      trial_ends_at: ends.toISOString(),
    })
    .eq('id', session.user.id);
}

export function getTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  if (end <= new Date()) return 0;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}
