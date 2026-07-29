/*
# Add activation_regions column to exercises

## Purpose
Store per-exercise muscle activation ratios directly in the database so that
both the client app and the server-side recompute edge function share a single
source of truth — eliminating the duplicated regex/lookup logic that previously
lived in `lib/muscle-regions.ts` and `supabase/functions/recompute-muscle-activation/index.ts`.

## New Column
- `exercises.activation_regions` (jsonb, default '[]')
  - Array of `{ "region": "<region_key>", "intensity": <0..1> }` objects.
  - Each region key matches one of the 17 keys in MUSCLE_REGIONS
    (chest_upper, chest_middle, chest_lower, shoulders_front, shoulders_side,
     shoulders_rear, back_upper, back_lats, back_lower, biceps, triceps,
     legs_quads, legs_hams, legs_glutes, legs_calves, abs, forearms).
  - Intensity is a fraction (0–1) representing how much of the exercise's
    set/volume load is attributed to that region.
  - Example: Barbell Bench Press →
    [{"region":"chest_middle","intensity":0.7},{"region":"triceps","intensity":0.15},{"region":"shoulders_front","intensity":0.15}]

## Security
- No RLS policy changes. The exercises table is already readable by all users
  (anon + authenticated). The new column inherits the table's existing policies.
- No new tables created.

## Notes
1. The column is nullable with a default of '[]'::jsonb so existing rows start
   with an empty array until the backfill edge function populates them.
2. After backfill, the recompute-muscle-activation edge function and the client
   lib/muscle-balance.ts will read `activation_regions` directly from the
   exercise row instead of computing ratios from name-matching rules.
3. The old `DEFAULT_SPLITS` / `NAME_RULES` logic in lib/muscle-regions.ts and
   the edge function will be replaced by a simple read of this column, with a
   fallback to the old logic only for exercises that have an empty array
   (e.g. brand-new custom exercises not yet backfilled).
*/

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS activation_regions jsonb NOT NULL DEFAULT '[]'::jsonb;
