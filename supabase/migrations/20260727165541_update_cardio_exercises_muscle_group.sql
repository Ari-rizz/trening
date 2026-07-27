/*
# Update cardio exercises to use 'cardio' as primary muscle group

1. Modified Tables
   - `exercises`: Updates 14 rows where category = 'cardio' but muscle_group = 'legs'
   
2. Changes
   - Sets muscle_group to 'cardio' for all exercises with category = 'cardio'
   - Adds 'legs' to secondary_muscles array if not already present (so they still show under Legs filter)
   
3. Important Notes
   - This makes cardio exercises visible when filtering by the 'Cardio' muscle group
   - They will also remain visible under 'Legs' via secondary_muscles matching in the app
*/

UPDATE exercises
SET 
  muscle_group = 'cardio',
  secondary_muscles = CASE
    WHEN NOT ('legs' = ANY(secondary_muscles)) THEN array_append(secondary_muscles, 'legs')
    ELSE secondary_muscles
  END
WHERE category = 'cardio' AND muscle_group != 'cardio';
