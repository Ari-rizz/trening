/*
# Backfill more exercise nicknames (batch 2)

1. Data Backfill
- Adds nicknames for ~40 more popular exercises to reach ~100 total.
- Covers Norwegian + English variants, abbreviations, and gym slang.
- Updates are matched by exact name so they are idempotent.

2. Security
- No RLS changes.

3. Important Notes
- Safe to re-run; overwrites with the same values.
*/

-- ===== SQUAT VARIANTS =====

UPDATE exercises SET nicknames = ARRAY['full squat','atg squat','ass to grass','full knebøy','dyb knebøy','complete squat','deep squat'] WHERE name = 'Barbell Full Squat' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['box squat','box knebøy','box kneboy','box squat stang'] WHERE name = 'Box Squat' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['squat to bench','bench squat','knebøy til benk','kneboy til benk'] WHERE name = 'Barbell Squat To A Bench' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['bodyweight squat','air squat','bw squat','kroppsvekt knebøy','luft knebøy','knebøy uten vekt'] WHERE name = 'Bodyweight Squat' AND nicknames IS NULL;

-- ===== BENCH DIPS =====

UPDATE exercises SET nicknames = ARRAY['bench dips','benk dips','triceps bench dips','benchdips','benk dip'] WHERE name = 'Bench Dips' AND nicknames IS NULL;

-- ===== PULLOVERS =====

UPDATE exercises SET nicknames = ARRAY['barbell pullover','bb pullover','stang pullover','pullover stang','bryst pullover stang'] WHERE name = 'Bent-Arm Barbell Pullover' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['dumbbell pullover','db pullover','hantel pullover','pullover hantel','bryst pullover hantel','db pullover bryst'] WHERE name = 'Bent-Arm Dumbbell Pullover' AND nicknames IS NULL;

-- ===== CABLE EXERCISES =====

UPDATE exercises SET nicknames = ARRAY['cable chest press','kabel brystpress','kabel press','cable press','cable chest'] WHERE name = 'Cable Chest Press' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['cable crunch','kabel crunch','kabel mage','cable abs crunch','cable mage crunch'] WHERE name = 'Cable Crunch' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['cable hammer curl','cable hammer curls','rope hammer curl','kabel hammer curl','kabel hammerløft','tau hammer curl'] WHERE name = 'Cable Hammer Curls - Rope Attachment' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['cable triceps extension','cable overhead triceps','kabel triceps extension','kabel triceps over hodet','cable overhead triceps extension'] WHERE name = 'Cable Incline Triceps Extension' AND nicknames IS NULL;

-- ===== MACHINE EXERCISES =====

UPDATE exercises SET nicknames = ARRAY['ab crunch machine','ab machine','mage maskin','crunch maskin','ab crunch maskin'] WHERE name = 'Ab Crunch Machine' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['butterfly','pec deck','fly maskin','butterfly maskin','pec deck maskin','flye maskin','peck deck'] WHERE name = 'Butterfly' AND nicknames IS NULL;

-- ===== GLUTES / HIPS =====

UPDATE exercises SET nicknames = ARRAY['glute bridge','glute bridges','hip bridge','rumpebryn løft','rumpebryn','rumpebryn uten vekt','bw glute bridge','kroppsvekt rumpebryn'] WHERE name = 'Butt Lift (Bridge)' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['hip raise','bent knee hip raise','knebøyd hofte løft','hofteløft','hofteløft bøyd kne'] WHERE name = 'Bent-Knee Hip Raise' AND nicknames IS NULL;

-- ===== SHOULDERS =====

UPDATE exercises SET nicknames = ARRAY['bradford press','rocky press','bradford rocky press','bradford press stang','rocky press stang'] WHERE name = 'Bradford/Rocky Presses' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['band pull apart','band pull-apart','pull apart','strikke pull apart','strikke trekk fra hverandre','band pullapart'] WHERE name = 'Band Pull Apart' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['deltoid raise','delt raise','alternating delt raise','veksel deltoid løft','skulder løft veksel'] WHERE name = 'Alternating Deltoid Raise' AND nicknames IS NULL;

-- ===== RENEGADE ROW =====

UPDATE exercises SET nicknames = ARRAY['renegade row','renegade rows','renegade roing','renegade roing hantel','plank row','plank roing','pushup row'] WHERE name = 'Alternating Renegade Row' AND nicknames IS NULL;

-- ===== BOX JUMP =====

UPDATE exercises SET nicknames = ARRAY['box jump','box jumps','boks hopp','box hop','box hopp','boks hopp multiple'] WHERE name = 'Box Jump (Multiple Response)' AND nicknames IS NULL;

-- ===== CALF =====

UPDATE exercises SET nicknames = ARRAY['seated calf raise barbell','sittende calf raise stang','sittende legger stang','barbell seated calves'] WHERE name = 'Barbell Seated Calf Raise' AND nicknames IS NULL;

-- ===== SIDE BEND =====

UPDATE exercises SET nicknames = ARRAY['side bend','side bends','barbell side bend','sidebøy stang','sidebøy','side løft stang','lateral bend stang'] WHERE name = 'Barbell Side Bend' AND nicknames IS NULL;

-- ===== SHRUG BEHIND BACK =====

UPDATE exercises SET nicknames = ARRAY['shrug behind back','behind the back shrug','back shrug','skuldretrkk bak rygg','skuldretrkk bakfra','traps bak'] WHERE name = 'Barbell Shrug Behind The Back' AND nicknames IS NULL;

-- ===== SIDE SPLIT SQUAT =====

UPDATE exercises SET nicknames = ARRAY['side split squat','side split knebøy','lateral split squat','side split kneboy','side lunge squat'] WHERE name = 'Barbell Side Split Squat' AND nicknames IS NULL;

-- ===== FLOOR PRESS =====

UPDATE exercises SET nicknames = ARRAY['floor press','kb floor press','gulv press kettlebell','gulv press kb','kettlebell floor press'] WHERE name = 'Alternating Floor Press' AND nicknames IS NULL;

-- ===== HANG CLEAN =====

UPDATE exercises SET nicknames = ARRAY['hang clean','hang cleans','kb hang clean','kettlebell hang clean','hanging clean kb','hang clean kettlebell'] WHERE name = 'Alternating Hang Clean' AND nicknames IS NULL;

-- ===== KETTLEBELL PRESS =====

UPDATE exercises SET nicknames = ARRAY['kb press','kettlebell press','kb skuldrepress','kettlebell skuldrepress','alternating kb press'] WHERE name = 'Alternating Kettlebell Press' AND nicknames IS NULL;

-- ===== KETTLEBELL ROW =====

UPDATE exercises SET nicknames = ARRAY['kb row','kettlebell row','kb roing','kettlebell roing','alternating kb row','kb en arm roing'] WHERE name = 'Alternating Kettlebell Row' AND nicknames IS NULL;

-- ===== CABLE SHOULDER PRESS =====

UPDATE exercises SET nicknames = ARRAY['cable shoulder press','cable press','kabel skuldrepress','kabel press alternerende','alternating cable press'] WHERE name = 'Alternating Cable Shoulder Press' AND nicknames IS NULL;

-- ===== BENCH PRESS VARIANTS =====

UPDATE exercises SET nicknames = ARRAY['powerlifting bench','pl bench','powerlifting benk','pl benk','benkpress powerlifting'] WHERE name = 'Bench Press - Powerlifting' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['band bench press','bench press bands','strikke benkpress','benkpress strikke','band benk'] WHERE name = 'Bench Press - With Bands' AND nicknames IS NULL;
UPDATE exercises SET nicknames = ARRAY['chain bench press','bench press chains','benkpress kjeder','kjede benkpress','chain benk'] WHERE name = 'Bench Press with Chains' AND nicknames IS NULL;

-- ===== LEG CURL VARIANTS =====

UPDATE exercises SET nicknames = ARRAY['ball leg curl','stability ball leg curl','ball hamstring curl','ball hamstring','stabilitetsball bein curl','ball bein curl'] WHERE name = 'Ball Leg Curl' AND nicknames IS NULL;

-- ===== GOOD MORNING VARIANTS =====

UPDATE exercises SET nicknames = ARRAY['band good morning','band pull through','strikke good morning','strikke pull through','band pull-through','strikke gjennomtrekk'] WHERE name = 'Band Good Morning (Pull Through)' AND nicknames IS NULL;

-- ===== BENCH JUMP =====

UPDATE exercises SET nicknames = ARRAY['bench jump','benk hopp','box bench jump','bench hop','benk hopp eksplosiv'] WHERE name = 'Bench Jump' AND nicknames IS NULL;

-- ===== BODYWEIGHT FLYES =====

UPDATE exercises SET nicknames = ARRAY['bodyweight fly','bw fly','kroppsvekt fly','kroppsvekt flyes','fly uten vekt','sliding fly'] WHERE name = 'Bodyweight Flyes' AND nicknames IS NULL;

-- ===== BODYWEIGHT ROW =====

UPDATE exercises SET nicknames = ARRAY['bodyweight row','bw row','australian pull-up','australian pullup','inverted row','kroppsvekt roing','kroppsvekt trekk','australian trekk'] WHERE name = 'Bodyweight Mid Row' AND nicknames IS NULL;

-- ===== BOARD PRESS =====

UPDATE exercises SET nicknames = ARRAY['board press','board bench press','brett press','brett benk','board benk press'] WHERE name = 'Board Press' AND nicknames IS NULL;

-- ===== BODY TRICEP PRESS =====

UPDATE exercises SET nicknames = ARRAY['body tricep press','bodyweight tricep press','bw tricep press','kroppsvekt triceps press','triceps press egen vekt'] WHERE name = 'Body Tricep Press' AND nicknames IS NULL;

-- ===== BARBELL CURL LYING INCLINE =====

UPDATE exercises SET nicknames = ARRAY['lying curl','incline lying curl','liggende curl','skrå liggende curl','curl liggende skrå'] WHERE name = 'Barbell Curls Lying Against An Incline' AND nicknames IS NULL;

-- ===== BARBELL ROLLOUT =====

UPDATE exercises SET nicknames = ARRAY['ab rollout','barbell rollout','ab wheel','stang rollout','mage rollout stang','rollout stang'] WHERE name = 'Barbell Rollout from Bench' AND nicknames IS NULL;

-- ===== INCLINE SHOULDER RAISE =====

UPDATE exercises SET nicknames = ARRAY['incline shoulder raise','incline front raise','skrå skulder løft','skrå front løft','incline front delt raise'] WHERE name = 'Barbell Incline Shoulder Raise' AND nicknames IS NULL;
