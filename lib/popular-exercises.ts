import { Exercise } from './supabase';

export const POPULAR_EXERCISE_IDS: string[] = [
  'ceccd9de-da25-44e6-8f4c-f31687acdf74', // Barbell Squat
  '14547569-02b7-4491-97ca-88cb96ea8dde', // Barbell Deadlift
  'a7e4131a-8de5-48a2-8b99-a116e041f8ee', // Romanian Deadlift
  '88e17548-e41c-430b-a4d1-a1884265a13a', // Split Squats
  'd81ea656-9af8-43bd-bbd0-db93138a0fb8', // Barbell Lunge
  '9f093abe-dbdf-4c69-a359-b0f9db368ce1', // Leg Press
  '8306961f-29b3-41d9-b7a2-1f131971a8b6', // Barbell Hip Thrust
  'dca80467-1184-44dc-b027-9908a6166b05', // Leg Extensions
  '7a2b4908-b6d7-4ea0-983c-4b40363bb02c', // Lying Leg Curls
  '53944c27-998c-4d36-bc7a-91a73e67deeb', // Standing Calf Raises
  '6b89e7ed-761e-470b-9dde-79bac7a98de1', // Barbell Bench Press - Medium Grip
  '1b5d2dd0-a201-40e1-967f-81d8738ff973', // Barbell Incline Bench Press - Medium Grip
  '05d42a54-e1d8-4947-8cfc-8dceccfe978f', // Pushups
  'a1e55aca-d1f9-43fb-83be-f9ac9cf04f3f', // Barbell Shoulder Press
  '9f84fa44-0c80-42e9-9fd0-e030e2441277', // Side Lateral Raise
  '0e2e1680-bda7-4b35-abce-3a25c69cb7ea', // Dips - Chest Version
  '22d4e40d-7b21-4714-9e6b-7da7e9be9904', // Dumbbell Flyes
  '531c240a-fc0e-480d-b83c-be27f4b959e7', // Chin-Up
  '3268eade-c738-4d9f-839f-751ceeb6c3e4', // Close-Grip Front Lat Pulldown
  'cee3de0d-9635-4687-991c-b324dee355a6', // Wide-Grip Lat Pulldown
  '16b94d25-c9e6-4ed0-9112-99a1caa0529c', // Seated Cable Rows
  '708bc470-22ac-47a2-9b29-6770d51b46e3', // Bent Over Barbell Row
  '07d09e7e-8825-4b6d-9083-a52d90ae5928', // One-Arm Dumbbell Row
  '2d9de537-de3e-4c67-b3ee-fde9f092c574', // Face Pull
  'a1b4767f-1f88-4bfc-baac-6e1f654e45f8', // Dumbbell Bicep Curl
  'af2b1178-1be0-4c9e-82ec-fa2e109bd401', // Hammer Curls
  '263cddec-31e7-4c72-b02b-58362ecdac80', // Triceps Pushdown
  'bb964716-7ac2-4c5c-942e-40e1b550ddb7', // Band Skull Crusher
  '7144d571-25be-4bd1-8698-bd8a2498715f', // Plank
  'e660d59e-002b-46fd-abb3-3cee804854c3', // Hanging Leg Raise
  '2563c101-ca32-4ccb-92da-f609e6022086', // Cable Crunch
];

export function getPopularExercises(allExercises: Exercise[]): Exercise[] {
  const idSet = new Set(POPULAR_EXERCISE_IDS);
  const found = allExercises.filter(ex => idSet.has(ex.id));
  return found.sort((a, b) => {
    const ai = POPULAR_EXERCISE_IDS.indexOf(a.id);
    const bi = POPULAR_EXERCISE_IDS.indexOf(b.id);
    return ai - bi;
  });
}
