/*
# Add nicknames column to exercises

1. New Columns
- `exercises.nicknames` (text[], nullable, default NULL)
  Stores alternative names, abbreviations, gym slang, and Norwegian/English
  translations for each exercise. Used by the smart search helper to match
  exercises by any common name the user might type.

2. Data Backfill
- Populates nicknames for ~100 of the most popular exercises, covering both
  Norwegian (e.g. "benk", "knebøy", "markløft") and English (e.g. "bench",
  "squat", "deadlift") variants, plus common abbreviations and gym slang.
- Updates are matched by name (ILIKE) so they are robust to ID changes.

3. Security
- No RLS changes. The exercises table is already world-readable for
  authenticated users; nicknames inherit the same policies.

4. Important Notes
- This migration is idempotent: re-running it will overwrite nicknames for the
  matched exercises with the same values, which is safe.
- Nicknames are managed on the backend only; users cannot edit them.
*/

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS nicknames text[] DEFAULT NULL;

-- ===== COMPOUND LIFTS =====

UPDATE exercises SET nicknames = ARRAY['bench','bench press','bp','flat bench','benk','benkpress','benk press','brystpress stang','flat press'] WHERE name ILIKE 'Barbell Bench Press - Medium Grip' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['squat','squats','backsquat','back squat','knebøy','kneboy','sqvett','knebøyd','deep squat','low bar squat','high bar squat'] WHERE name ILIKE 'Barbell Squat' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['deadlift','deadlifts','dl','mark','markløft','markloft','conventional deadlift','conv deadlift'] WHERE name ILIKE 'Barbell Deadlift' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['ohp','overhead press','military press','military','shoulder press','skulderpress','skuldrepress','press stang','standing press','strict press'] WHERE name ILIKE 'Barbell Shoulder Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['barbell row','bent over row','bent-over row','pendlay row','bb row','roing stang','roing','fråhånds roing','bøyd roing'] WHERE name ILIKE 'Bent Over Barbell Row' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['front squat','frontsquat','front knebøy','front kneboy','clean squat'] WHERE name ILIKE 'Front Squat%' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['sumo deadlift','sumo dl','sumo mark','sumo markløft','sumo'] WHERE name ILIKE 'Sumo Deadlift' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['rdl','romanian deadlift','romanian dl','rumensk markløft','rumensk mark','stiff leg deadlift'] WHERE name ILIKE 'Romanian Deadlift' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['good morning','good mornings','gm','bøy knebøy','bøyed lift','good morning stang'] WHERE name ILIKE 'Good Morning' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['hack squat','hack','hack knebøy','hackmaskin'] WHERE name ILIKE 'Hack Squat' AND nicknames IS NULL;

-- ===== BENCH PRESS VARIANTS =====

UPDATE exercises SET nicknames = ARRAY['incline bench','incline press','skråbenk','skrå benk','skråbench','skrå press','incline barbell press'] WHERE name ILIKE 'Barbell Incline Bench Press%' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell bench','db bench','hantel benk','hantel bench','db press','dumbbell press','flat dumbbell press'] WHERE name ILIKE 'Dumbbell Bench Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['incline dumbbell press','incline db press','skrå hantel press','skrå db press','incline db bench'] WHERE name ILIKE 'Incline Dumbbell Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell fly','db fly','hantel fly','hantel flyes','db flyes','dumbbell flyes','pec fly dumbbell'] WHERE name ILIKE 'Dumbbell Flyes' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['cable crossover','cable cross','kabel kryss','kabelkryss','cable fly','kabel fly'] WHERE name ILIKE 'Cable Crossover' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['guillotine press','neck press','hals press','guillotine bench'] WHERE name ILIKE 'Barbell Guillotine Bench Press' AND nicknames IS NULL;

-- ===== BACK =====

UPDATE exercises SET nicknames = ARRAY['pull-up','pullup','pull up','pullups','pull-ups','kipp pull-up','strict pull-up','chins','chin-up','chinup','chin ups','chin-ups','opp trekk','opp-trekk','opptrekk'] WHERE name ILIKE 'Chin-Up' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['assisted pull-up','band pull-up','strikke pull-up','assisted chins','band chins'] WHERE name ILIKE 'Band Assisted Pull-Up' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell row','db row','hantel roing','db roing','bent over db row','one arm row','1 arm row'] WHERE name ILIKE 'Bent Over Two-Dumbbell Row' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['t-bar row','tbar row','t bar row','t-roing','tbar roing'] WHERE name ILIKE 'Bent Over One-Arm Long Bar Row' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['barbell shrug','bb shrug','shrug stang','skuldretrkk stang','traps','trappe'] WHERE name ILIKE 'Barbell Shrug' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell shrug','db shrug','hantel skuldretrkk','db shrugs','hantel shrug'] WHERE name ILIKE 'Dumbbell Shrug' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['upright row','upright rows','upright roing','skuldre roing','high pull'] WHERE name ILIKE 'Upright Row%' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['rear delt row','rear deltoid row','bakre skulder roing'] WHERE name ILIKE 'Barbell Rear Delt Row' AND nicknames IS NULL;

-- ===== SHOULDERS =====

UPDATE exercises SET nicknames = ARRAY['arnold press','arnold press','arnold skuldrepress','arnold press hantel'] WHERE name ILIKE 'Arnold Dumbbell Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell shoulder press','db shoulder press','db ohp','hantel skuldrepress','hantel press','db military','seated db press'] WHERE name ILIKE 'Dumbbell Shoulder Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['lateral raise','side raise','side lateral','lateral','side raise db','hantel side løft','side hev','side løft','sidehev','sideløft'] WHERE name ILIKE 'Side Lateral Raise' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['face pull','facepull','face pulls','ansiktstrekk','face pull kabel'] WHERE name ILIKE 'Face Pull' AND nicknames IS NULL;

-- ===== BICEPS =====

UPDATE exercises SET nicknames = ARRAY['barbell curl','bb curl','bicep curl stang','biceps curl stang','stang curl','curl stang','bicep stang'] WHERE name ILIKE 'Barbell Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['hammer curl','hammer curls','hammers','hammer curl db','hammer hantel','hammerløft','hammer curl hantel'] WHERE name ILIKE 'Hammer Curls' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['preacher curl','preacher','preacher bench curl','preacher bicep curl','preacher krøll','scott curl','scott krøll','preacher hantel'] WHERE name ILIKE 'Preacher Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['drag curl','drag curls','body drag curl','bodydrag curl'] WHERE name ILIKE 'Drag Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['spider curl','spider curls','spider bench curl','spider krøll'] WHERE name ILIKE 'Spider Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['zottman curl','zottman','zottman curls','zottman hantel'] WHERE name ILIKE 'Zottman Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['alternate hammer curl','alt hammer','alternating hammer','veksels hammer curl'] WHERE name ILIKE 'Alternate Hammer Curl' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['incline db curl','incline dumbbell curl','skrå hantel curl','skrå db curl','incline curl'] WHERE name ILIKE 'Alternate Incline Dumbbell Curl' AND nicknames IS NULL;

-- ===== TRICEPS =====

UPDATE exercises SET nicknames = ARRAY['pushdown','triceps pushdown','cable pushdown','triceps pushdown kabel','pushdown kabel','pushdown tau','kabel pushdown','triceps kabel','triceps nedtrekk'] WHERE name ILIKE 'Triceps Pushdown' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['rope pushdown','rope triceps pushdown','tau pushdown','tau triceps pushdown','triceps pushdown tau','rope attachment pushdown'] WHERE name ILIKE 'Triceps Pushdown - Rope Attachment' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['v-bar pushdown','v bar pushdown','v-bar triceps pushdown','v-bar triceps','v-stang pushdown'] WHERE name ILIKE 'Triceps Pushdown - V-Bar Attachment' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['overhead triceps extension','overhead triceps','overhead extension','triceps overhead','overhead triceps tau','overhead triceps kabel','french press','frenchpress','skallekrusher','skull crusher','skull crushers','skullcrusher','skullcrushers'] WHERE name ILIKE 'Triceps Overhead Extension with Rope' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['kickback','tricep kickback','triceps kickback','triceps kickback hantel','kickback hantel','tricep kickback db'] WHERE name ILIKE 'Tricep Dumbbell Kickback' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['band skull crusher','band skullcrusher','strikke skull crusher','strikke skallekrusher'] WHERE name ILIKE 'Band Skull Crusher' AND nicknames IS NULL;

-- ===== LEGS =====

UPDATE exercises SET nicknames = ARRAY['leg press','legpress','beinpress','benk press bein','bein press','leg press maskin','hack press'] WHERE name ILIKE 'Leg Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['leg extension','leg extensions','bein extension','bein strekk','quads extension','quads strekk','leg ext'] WHERE name ILIKE 'Leg Extensions' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['seated calf raise','sittende calf raise','sittende leggerømpe','seated calves','sittende legger','calf raise sittende'] WHERE name ILIKE 'Seated Calf Raise' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['standing calf raise','standing calves','stående calf raise','stående legger','calf raise stående','stående leggerømpe'] WHERE name ILIKE 'Standing Calf Raises' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['calf raise','calf raises','calves','leggerømpe','legger','calf','calf raise db','calf hantel'] WHERE name ILIKE 'Calf Raise On A Dumbbell' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['split squat','split squats','split knebøy','split kneboy','bulgarian split squat','bulgarian','bulgarsk knebøy','bulgarsk split','split squat db'] WHERE name ILIKE 'Split Squats' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['split squat db','split squat dumbbell','split squat hantel','dumbbell split squat','hantel split squat'] WHERE name ILIKE 'Split Squat with Dumbbells' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['goblet squat','goblet','goblet knebøy','goblet kettlebell squat','goblet kneboy','kettlebell goblet squat'] WHERE name ILIKE 'Goblet Squat' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['barbell lunge','lunge stang','utfall stang','barbell utfall','stang lunge','stang utfall'] WHERE name ILIKE 'Barbell Lunge' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['walking lunge','walking lunges','gående utfall','gående lunge','barbell walking lunge','gående lunge stang'] WHERE name ILIKE 'Barbell Walking Lunge' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['step up','step ups','step-up','step-ups','step up stang','barbell step up','trapp stang','trapp opp stang'] WHERE name ILIKE 'Barbell Step Ups' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['front squat kb','front squat kettlebell','front knebøy kettlebell','front kneboy kettlebell','kb front squat'] WHERE name ILIKE 'Front Squats With Two Kettlebells' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['barbell hack squat','hack squat stang','hack knebøy stang','hack kneboy stang'] WHERE name ILIKE 'Barbell Hack Squat' AND nicknames IS NULL;

-- ===== GLUTES =====

UPDATE exercises SET nicknames = ARRAY['hip thrust','hip thrusts','hip thrust stang','barbell hip thrust','hoftetøystøt','hoftetøy støt','hoftestøt','glute thrust','brent thrust'] WHERE name ILIKE 'Barbell Hip Thrust' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['glute bridge','glute bridges','glute bridge stang','barbell glute bridge','rumpebryn stang','rumpebryn løft','glute bridge stang','hip thrust stang flat'] WHERE name ILIKE 'Barbell Glute Bridge' AND nicknames IS NULL;

-- ===== CHEST =====

UPDATE exercises SET nicknames = ARRAY['push-up','pushup','pushups','push-ups','push ups','push up','armheving','armhevinger','arm heving','press up','presse opp'] WHERE name ILIKE 'Pushups' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['wide push-up','wide pushup','wide push ups','wide armheving','brede armhevinger','brede push ups'] WHERE name ILIKE 'Push-Up Wide' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['close grip push-up','close pushup','narrow push-up','narrow pushup','smal armheving','smal push up','close push up','narrow push up'] WHERE name ILIKE 'Push-Ups - Close Triceps Position' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dips','dips chest','chest dips','bryst dips','dips bryst','brystdips','parallel bar dips'] WHERE name ILIKE 'Dips - Chest Version' AND nicknames IS NULL;

-- ===== TRICEPS DIPS =====

UPDATE exercises SET nicknames = ARRAY['triceps dips','dips triceps','tricepsdips','dips triceps version','triceps dip','arm dips'] WHERE name ILIKE 'Dips - Triceps Version' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dip machine','machine dips','maskin dips','dips maskin'] WHERE name ILIKE 'Dip Machine' AND nicknames IS NULL;

-- ===== ABS =====

UPDATE exercises SET nicknames = ARRAY['plank','planks','planking','planke','planker','planke trening','front planke','core planke'] WHERE name ILIKE 'Plank' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['crunch','crunches','sit up crunch','crunch mage','mage crunch','magen crunch','bukkeknebøy'] WHERE name ILIKE 'Crunches' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['sit-up','sit ups','situps','sit-ups','sit up','situps mage','situp','sitt opp','sete opp'] WHERE name ILIKE 'Sit-Up' AND nicknames IS NULL;

-- ===== BACK EXTENSION =====

UPDATE exercises SET nicknames = ARRAY['hyperextension','hyperextensions','back extension','back extensions','rygglekk','rygglekk maskin','rygg ext','lower back extension','romersk stol','roman chair'] WHERE name ILIKE 'Hyperextensions (Back Extensions)' AND nicknames IS NULL;

-- ===== FOREARMS / FARMER WALK =====

UPDATE exercises SET nicknames = ARRAY['farmer walk','farmer walks','farmers walk','farmers walk','farmers carry','farmer carry','farmer bære','bondegård tur','bonde walk','farmer walk hantel'] WHERE name ILIKE 'Farmer''s Walk' AND nicknames IS NULL;

-- ===== ROWING =====

UPDATE exercises SET nicknames = ARRAY['rowing','rowing machine','row machine','roing maskin','ro maskin','erg','ergometer','concept2','concept 2','indoor rower'] WHERE name ILIKE 'Rowing, Stationary' AND nicknames IS NULL;

-- ===== ADD GINN INDEX FOR FASTER NICKNAME SEARCH =====
CREATE INDEX IF NOT EXISTS exercises_nicknames_gin_idx
  ON exercises USING GIN (nicknames);
