export interface ProgramExercise {
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number;
  durationSeconds?: number;
  notes?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: ProgramExercise[];
}

export type ProgramLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Program {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  level: ProgramLevel;
  daysPerWeek: number;
  durationWeeks: number;
  tags: string[];
  accentColor: string;
  days: ProgramDay[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'full-body-3',
    name: 'Full Body (3 days)',
    shortDescription: 'Tren hele kroppen 3 ganger i uken',
    description: 'Effektivt full-kroppsprogram som treffer alle muskelgrupper i hver økt. Ideelt for nybegynnere og de som vil holde treningsfrekvensen høy med god restitusjon.',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 8,
    tags: ['legs', 'chest', 'back', 'shoulders'],
    accentColor: '#3b82f6',
    days: [
      {
        id: 'fb3-day1',
        name: 'Day 1 — Full Body A',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'Barbell Bench Press - Medium Grip', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'Bent Over Barbell Row', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'Dumbbell Shoulder Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek hold' },
          { exerciseName: 'Crunches', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'fb3-day2',
        name: 'Day 2 — Full Body B',
        exercises: [
          { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Wide-Grip Lat Pulldown', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Goblet Squat', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
      {
        id: 'fb3-day3',
        name: 'Day 3 — Full Body C',
        exercises: [
          { exerciseName: 'Barbell Deadlift', sets: 3, reps: 5, restSeconds: 180 },
          { exerciseName: 'Dumbbell Bench Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Cable Rows', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Barbell Lunge', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Side Lateral Raise', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek hold' },
        ],
      },
    ],
  },
  {
    id: 'ppl-6',
    name: 'Push Pull Legs (6 days)',
    shortDescription: 'Klassisk PPL-split med 6 treningsdager',
    description: 'Det mest populære splittede programmet for mellomtrente. Push (bryst/skuldre/triceps), Pull (rygg/biceps) og Legs kjøres to ganger per uke for optimal frekvens og volum.',
    level: 'intermediate',
    daysPerWeek: 6,
    durationWeeks: 12,
    tags: ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps'],
    accentColor: '#ef4444',
    days: [
      {
        id: 'ppl-push-a',
        name: 'Day 1 — Push A',
        exercises: [
          { exerciseName: 'Barbell Bench Press - Medium Grip', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Dumbbell Flyes', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Barbell Shoulder Press', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'Side Lateral Raise', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Triceps Pushdown', sets: 4, reps: 12, restSeconds: 60 },
          { exerciseName: 'Dips - Triceps Version', sets: 3, reps: 10, restSeconds: 90 },
        ],
      },
      {
        id: 'ppl-pull-a',
        name: 'Day 2 — Pull A',
        exercises: [
          { exerciseName: 'Barbell Deadlift', sets: 4, reps: 5, restSeconds: 180 },
          { exerciseName: 'Bent Over Barbell Row', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Wide-Grip Lat Pulldown', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Seated Cable Rows', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Barbell Curl', sets: 3, reps: 10, restSeconds: 60 },
          { exerciseName: 'Cable Hammer Curls - Rope Attachment', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'ppl-legs-a',
        name: 'Day 3 — Legs A',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Leg Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Lying Leg Curls', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Standing Calf Raises', sets: 4, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'ppl-push-b',
        name: 'Day 4 — Push B',
        exercises: [
          { exerciseName: 'Barbell Shoulder Press', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Dumbbell Bench Press', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Incline Cable Flye', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Side Lateral Raise', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Cable Rope Overhead Triceps Extension', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Bench Dips', sets: 3, reps: 15, restSeconds: 90 },
        ],
      },
      {
        id: 'ppl-pull-b',
        name: 'Day 5 — Pull B',
        exercises: [
          { exerciseName: 'Chin-Up', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Seated Cable Rows', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Wide-Grip Rear Pull-Up', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'EZ-Bar Curl', sets: 4, reps: 10, restSeconds: 60 },
          { exerciseName: 'Dumbbell Lying Rear Lateral Raise', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'ppl-legs-b',
        name: 'Day 6 — Legs B',
        exercises: [
          { exerciseName: 'Barbell Lunge', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Goblet Squat', sets: 3, reps: 15, restSeconds: 90 },
          { exerciseName: 'Barbell Hip Thrust', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Leg Curl', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Seated Calf Raise', sets: 4, reps: 20, restSeconds: 60 },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper Lower (4 days)',
    shortDescription: 'Effektiv 4-dagssplit for overkropp og underkropp',
    description: 'Balansert program som deler kroppen i overkropp (Upper) og underkropp (Lower). Gir god frekvens (2× per muskelgruppe) med nok hvile mellom øktene.',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 10,
    tags: ['chest', 'back', 'legs', 'shoulders'],
    accentColor: '#f59e0b',
    days: [
      {
        id: 'ul-upper-a',
        name: 'Day 1 — Upper A',
        exercises: [
          { exerciseName: 'Barbell Bench Press - Medium Grip', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Bent Over Barbell Row', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Wide-Grip Lat Pulldown', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Barbell Shoulder Press', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseName: 'Barbell Curl', sets: 3, reps: 10, restSeconds: 60 },
          { exerciseName: 'Triceps Pushdown', sets: 3, reps: 10, restSeconds: 60 },
        ],
      },
      {
        id: 'ul-lower-a',
        name: 'Day 2 — Lower A',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Leg Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Lying Leg Curls', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Standing Calf Raises', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek hold' },
        ],
      },
      {
        id: 'ul-upper-b',
        name: 'Day 3 — Upper B',
        exercises: [
          { exerciseName: 'Barbell Shoulder Press', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Chin-Up', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Dumbbell Bench Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Cable Rows', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Dumbbell Flyes', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'EZ-Bar Curl', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Dips - Triceps Version', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'ul-lower-b',
        name: 'Day 4 — Lower B',
        exercises: [
          { exerciseName: 'Barbell Deadlift', sets: 4, reps: 5, restSeconds: 180 },
          { exerciseName: 'Barbell Lunge', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Barbell Hip Thrust', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Leg Curl', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Seated Calf Raise', sets: 4, reps: 20, restSeconds: 60 },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'hypertrophy-5',
    name: 'Hypertrophy (5 days)',
    shortDescription: 'Høyt volum fokusert på muskelvekst',
    description: 'Dedikert hypertrofiprogram med høyt treningsvolum og isolasjonsøvelser. 5-dagersplit for maksimal muskelvekst med fokus på tid under spenning og metabolsk stress.',
    level: 'intermediate',
    daysPerWeek: 5,
    durationWeeks: 12,
    tags: ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps'],
    accentColor: '#10b981',
    days: [
      {
        id: 'hyp-chest-tri',
        name: 'Day 1 — Chest & Triceps',
        exercises: [
          { exerciseName: 'Barbell Bench Press - Medium Grip', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Incline Dumbbell Press', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Dumbbell Flyes', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Decline Barbell Bench Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Triceps Pushdown', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'EZ-Bar Skullcrusher', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Dips - Triceps Version', sets: 3, reps: 12, restSeconds: 90 },
        ],
      },
      {
        id: 'hyp-back-bi',
        name: 'Day 2 — Back & Biceps',
        exercises: [
          { exerciseName: 'Barbell Deadlift', sets: 4, reps: 6, restSeconds: 180 },
          { exerciseName: 'Bent Over Barbell Row', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Wide-Grip Lat Pulldown', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Cable Rows', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Barbell Curl', sets: 4, reps: 12, restSeconds: 60 },
          { exerciseName: 'Dumbbell Bicep Curl', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'hyp-shoulders-abs',
        name: 'Day 3 — Shoulders & Abs',
        exercises: [
          { exerciseName: 'Barbell Shoulder Press', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Side Lateral Raise', sets: 5, reps: 15, restSeconds: 60 },
          { exerciseName: 'Dumbbell Lying Rear Lateral Raise', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Hanging Leg Raise', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Crunches', sets: 4, reps: 20, restSeconds: 60 },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek hold' },
        ],
      },
      {
        id: 'hyp-legs-quad',
        name: 'Day 4 — Legs (Quad)',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 5, reps: 10, restSeconds: 120 },
          { exerciseName: 'Leg Press', sets: 4, reps: 15, restSeconds: 90 },
          { exerciseName: 'Split Squat with Dumbbells', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Lying Leg Curls', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Seated Calf Raise', sets: 5, reps: 20, restSeconds: 60 },
        ],
      },
      {
        id: 'hyp-legs-post',
        name: 'Day 5 — Legs (Posterior)',
        exercises: [
          { exerciseName: 'Romanian Deadlift', sets: 4, reps: 12, restSeconds: 120 },
          { exerciseName: 'Barbell Hip Thrust', sets: 4, reps: 15, restSeconds: 90 },
          { exerciseName: 'Barbell Lunge', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Leg Curl', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Standing Calf Raises', sets: 5, reps: 20, restSeconds: 60 },
          { exerciseName: 'Goblet Squat', sets: 3, reps: 15, restSeconds: 90 },
        ],
      },
    ],
  },
  {
    id: 'strength-5x5',
    name: 'Strength 5x5',
    shortDescription: 'Klassisk styrkeprogram med 5 sett × 5 reps',
    description: 'Basert på Stronglifts 5×5. Alternér mellom Workout A og B tre ganger i uken (f.eks. man/ons/fre). Øk vekten med 2,5 kg per treningsøkt for beinstyrke og 1,25 kg for overkropp.',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 16,
    tags: ['legs', 'chest', 'back', 'shoulders'],
    accentColor: '#8b5cf6',
    days: [
      {
        id: '5x5-a',
        name: 'Workout A',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 5, reps: 5, restSeconds: 180, notes: 'Øk 2,5 kg per økt' },
          { exerciseName: 'Barbell Bench Press - Medium Grip', sets: 5, reps: 5, restSeconds: 180, notes: 'Øk 1,25 kg per økt' },
          { exerciseName: 'Bent Over Barbell Row', sets: 5, reps: 5, restSeconds: 180, notes: 'Øk 1,25 kg per økt' },
        ],
      },
      {
        id: '5x5-b',
        name: 'Workout B',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 5, reps: 5, restSeconds: 180, notes: 'Øk 2,5 kg per økt' },
          { exerciseName: 'Barbell Shoulder Press', sets: 5, reps: 5, restSeconds: 180, notes: 'Øk 1,25 kg per økt' },
          { exerciseName: 'Barbell Deadlift', sets: 1, reps: 5, restSeconds: 300, notes: 'Kun 1 arbeidssett. Øk 5 kg per økt' },
        ],
      },
    ],
  },
  {
    id: 'beginner',
    name: 'Beginner Program',
    shortDescription: 'Perfekt startpunkt for nybegynnere',
    description: 'Enkelt og effektivt full-kroppsprogram for deg som er ny i treningssalen. Fokus på å lære grunnleggende bevegelsesmønstre og bygge base med 3 sett per øvelse.',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 8,
    tags: ['chest', 'back', 'legs', 'shoulders'],
    accentColor: '#06b6d4',
    days: [
      {
        id: 'beg-day1',
        name: 'Day 1 — Full Body A',
        exercises: [
          { exerciseName: 'Barbell Squat', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Dumbbell Bench Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Bent Over Barbell Row', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Dumbbell Shoulder Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Plank', sets: 3, reps: 20, restSeconds: 60, durationSeconds: 20, notes: '20 sek hold' },
          { exerciseName: 'Crunches', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'beg-day2',
        name: 'Day 2 — Full Body B',
        exercises: [
          { exerciseName: 'Goblet Squat', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Push-Up Wide', sets: 3, reps: 10, restSeconds: 60 },
          { exerciseName: 'Wide-Grip Lat Pulldown', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Face Pull', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Side Lateral Raise', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Crunches', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'beg-day3',
        name: 'Day 3 — Full Body C',
        exercises: [
          { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Seated Cable Rows', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Barbell Lunge', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 10, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'calisthenics-beginner',
    name: 'Calisthenics Beginner',
    shortDescription: 'Styrketrekening med kun kroppsvekt',
    description: 'Bygg sterk kropp uten utstyr. Fokus på grunnleggende kalisthenics-bevegelser som push-ups, pull-ups og kroppsvektsknebøy. Perfekt for hjemmetrening eller nybegynnere.',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 8,
    tags: ['chest', 'back', 'abs', 'triceps', 'legs'],
    accentColor: '#84cc16',
    days: [
      {
        id: 'cal-beg-day1',
        name: 'Day 1 — Push & Pull',
        exercises: [
          { exerciseName: 'Push-Up Wide', sets: 4, reps: 10, restSeconds: 90 },
          { exerciseName: 'Chin-Up', sets: 4, reps: 5, restSeconds: 120, notes: 'Max reps om du ikke klarer 5' },
          { exerciseName: 'Bench Dips', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek hold' },
          { exerciseName: 'Crunches', sets: 3, reps: 20, restSeconds: 60 },
        ],
      },
      {
        id: 'cal-beg-day2',
        name: 'Day 2 — Legs & Core',
        exercises: [
          { exerciseName: 'Incline Push-Up Medium', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseName: 'Wide-Grip Rear Pull-Up', sets: 3, reps: 5, restSeconds: 120, notes: 'Så mange reps som mulig' },
          { exerciseName: 'Split Squats', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 10, restSeconds: 60 },
          { exerciseName: 'Side Bridge', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek per side' },
        ],
      },
      {
        id: 'cal-beg-day3',
        name: 'Day 3 — Full Body',
        exercises: [
          { exerciseName: 'Push-Up Wide', sets: 4, reps: 12, restSeconds: 60 },
          { exerciseName: 'Chin-Up', sets: 4, reps: 6, restSeconds: 120 },
          { exerciseName: 'Dips - Triceps Version', sets: 3, reps: 8, restSeconds: 90 },
          { exerciseName: 'Goblet Squat', sets: 3, reps: 15, restSeconds: 90 },
          { exerciseName: 'Plank', sets: 3, reps: 45, restSeconds: 60, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Crunches', sets: 3, reps: 25, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'calisthenics-advanced',
    name: 'Calisthenics Advanced',
    shortDescription: 'Avansert kalisthenics for erfarne utøvere',
    description: 'Intensivt kalisthenics-program med høy volum og eksplosive bevegelser. Krever god base i push-ups, pull-ups og dips. Fokus på maksimal styrke og muskelutholdenhet.',
    level: 'advanced',
    daysPerWeek: 4,
    durationWeeks: 12,
    tags: ['chest', 'back', 'abs', 'triceps', 'legs'],
    accentColor: '#f97316',
    days: [
      {
        id: 'cal-adv-push',
        name: 'Day 1 — Push',
        exercises: [
          { exerciseName: 'Parallel Bar Dip', sets: 4, reps: 10, restSeconds: 120 },
          { exerciseName: 'Push-Up Wide', sets: 5, reps: 15, restSeconds: 60 },
          { exerciseName: 'Decline Push-Up', sets: 4, reps: 12, restSeconds: 60 },
          { exerciseName: 'Bench Dips', sets: 3, reps: 20, restSeconds: 90 },
          { exerciseName: 'Overhead Triceps', sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        id: 'cal-adv-pull',
        name: 'Day 2 — Pull',
        exercises: [
          { exerciseName: 'Wide-Grip Rear Pull-Up', sets: 5, reps: 8, restSeconds: 120 },
          { exerciseName: 'Chin-Up', sets: 4, reps: 10, restSeconds: 120 },
          { exerciseName: 'Gorilla Chin/Crunch', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseName: 'Hanging Leg Raise', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseName: 'Crunches', sets: 4, reps: 25, restSeconds: 60 },
        ],
      },
      {
        id: 'cal-adv-legs',
        name: 'Day 3 — Legs & Explosive',
        exercises: [
          { exerciseName: 'Box Jump (Multiple Response)', sets: 4, reps: 8, restSeconds: 90 },
          { exerciseName: 'Freehand Jump Squat', sets: 4, reps: 15, restSeconds: 90 },
          { exerciseName: 'Split Squats', sets: 4, reps: 12, restSeconds: 90 },
          { exerciseName: 'Mountain Climbers', sets: 3, reps: 30, restSeconds: 60, durationSeconds: 30, notes: '30 sek per sett' },
          { exerciseName: 'Plank', sets: 3, reps: 45, restSeconds: 60, durationSeconds: 45, notes: '45 sek hold' },
        ],
      },
      {
        id: 'cal-adv-full',
        name: 'Day 4 — Full Body',
        exercises: [
          { exerciseName: 'Parallel Bar Dip', sets: 3, reps: 12, restSeconds: 120 },
          { exerciseName: 'Wide-Grip Rear Pull-Up', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseName: 'Push-Up Wide', sets: 4, reps: 20, restSeconds: 60 },
          { exerciseName: 'Hanging Leg Raise', sets: 4, reps: 20, restSeconds: 60 },
          { exerciseName: 'Plank', sets: 3, reps: 45, restSeconds: 60, durationSeconds: 45, notes: '45 sek hold' },
        ],
      },
    ],
  },
  {
    id: 'fat-loss-hiit',
    name: 'Fat Loss / HIIT',
    shortDescription: 'Høyintensiv intervalltrening for fettforbrenning',
    description: 'Effektiv fettforbrenningsruti med tidsbaserte intervaller. Hvert intervall er 30 sekunder arbeid. Kjøres som sirkler med minimalt med hvile. Øk intensiteten gradvis over ukene.',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 8,
    tags: ['legs', 'abs', 'chest'],
    accentColor: '#ec4899',
    days: [
      {
        id: 'hiit-day1',
        name: 'Day 1 — HIIT Circuit A',
        exercises: [
          { exerciseName: 'Freehand Jump Squat', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Mountain Climbers', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Push-Up Wide', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Box Jump (Multiple Response)', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Crunches', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek hold' },
        ],
      },
      {
        id: 'hiit-day2',
        name: 'Day 2 — HIIT Circuit B',
        exercises: [
          { exerciseName: 'Split Squats', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid per bein' },
          { exerciseName: 'Incline Push-Up Medium', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Mountain Climbers', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Freehand Jump Squat', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Hanging Leg Raise', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Side Jackknife', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek per side' },
        ],
      },
      {
        id: 'hiit-day3',
        name: 'Day 3 — HIIT Strength',
        exercises: [
          { exerciseName: 'Goblet Squat', sets: 4, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Push-Up Wide', sets: 4, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Mountain Climbers', sets: 4, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Box Jump (Multiple Response)', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Crunches', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek arbeid, 30 sek hvile' },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek hold' },
        ],
      },
    ],
  },
  {
    id: 'mobility-recovery',
    name: 'Mobility & Recovery',
    shortDescription: 'Bevegelighet og restitusjon for bedre ytelse',
    description: 'Strukturert mobilitetsprogram for å forbedre bevegelighet, redusere stramhet og forebygge skader. Passer perfekt som aktiv restitusjon mellom tunge treningsdager.',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 0,
    tags: ['back', 'legs', 'abs'],
    accentColor: '#14b8a6',
    days: [
      {
        id: 'mob-upper',
        name: 'Day 1 — Upper Body Mobility',
        exercises: [
          { exerciseName: "Child's Pose", sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Cat Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Seated Overhead Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Standing Lateral Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per side' },
          { exerciseName: 'Overhead Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
        ],
      },
      {
        id: 'mob-lower',
        name: 'Day 2 — Lower Body Mobility',
        exercises: [
          { exerciseName: 'Seated Hamstring and Calf Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Calf Stretch Hands Against Wall', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per bein' },
          { exerciseName: 'Kneeling Hip Flexor', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per side' },
          { exerciseName: 'Intermediate Hip Flexor and Quad Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per side' },
          { exerciseName: 'Standing Hip Flexors', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per side' },
        ],
      },
      {
        id: 'mob-full',
        name: 'Day 3 — Full Body Recovery',
        exercises: [
          { exerciseName: "Child's Pose", sets: 3, reps: 60, restSeconds: 15, durationSeconds: 60, notes: '60 sek hold' },
          { exerciseName: 'Standing Gastrocnemius Calf Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek per bein' },
          { exerciseName: 'Seated Calf Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Overhead Stretch', sets: 3, reps: 45, restSeconds: 15, durationSeconds: 45, notes: '45 sek hold' },
          { exerciseName: 'Plank', sets: 3, reps: 30, restSeconds: 30, durationSeconds: 30, notes: '30 sek lett hold' },
        ],
      },
    ],
  },
];
