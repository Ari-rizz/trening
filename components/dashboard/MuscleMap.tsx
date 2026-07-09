'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
  debug?: boolean;
}

const SRC = { w: 1536, h: 1024 };
// Landscape crop: trim ~120px text columns from each side, keep full height
const CROP = { x: 120, y: 0, w: 1296, h: 1024 };

// backgroundSize: scale so the crop fills the container exactly
const BG_SIZE_X = (SRC.w / CROP.w) * 100;   // 118.52%
const BG_SIZE_Y = (SRC.h / CROP.h) * 100;   // 100%
// backgroundPosition: shift so the crop window starts at CROP.x
// Formula: CROP.x / (SRC.w - CROP.w) * 100  (percentage of overflow)
const BG_POS_X = CROP.w < SRC.w ? (CROP.x / (SRC.w - CROP.w)) * 100 : 0; // 50%
const BG_POS_Y = CROP.h < SRC.h ? (CROP.y / (SRC.h - CROP.h)) * 100 : 0; // 0%

export function MuscleMap({ trainedMuscles, gender, debug = false }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);
  const male = gender !== 'female';

  const imgSrc = male
    ? '/1c21f7c8-7c94-47e8-b2c0-02fcda0c46a1-converted.svg'
    : '/71550f93-d14b-4ed6-bb09-fe4edda4f925-converted.svg';

  const ms = (muscle: string) => ({
    fill: trained.has(muscle) ? getMuscleGroupColor(muscle) : 'transparent',
    opacity: trained.has(muscle) ? 0.48 : 0,
    filter: trained.has(muscle) ? 'url(#mGlow)' : undefined,
    style: { transition: 'fill 0.4s ease, opacity 0.4s ease' } as React.CSSProperties,
  });

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        aspectRatio: `${CROP.w} / ${CROP.h}`,
        backgroundImage: `url('${imgSrc}')`,
        backgroundSize: `${BG_SIZE_X.toFixed(2)}% ${BG_SIZE_Y.toFixed(2)}%`,
        backgroundPosition: `${BG_POS_X.toFixed(2)}% ${BG_POS_Y.toFixed(2)}%`,
        backgroundRepeat: 'no-repeat',
      }}
    >
      <svg
        viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {debug ? (
          /* ── CALIBRATION GRID ────────────────────────────────────────
             Red dots every 200px (x) × 150px (y) in source coordinates.
             Labels show source x,y so we can map them to body landmarks.
          ─────────────────────────────────────────────────────────────── */
          <>
            {[200, 400, 600, 800, 1000, 1200, 1400].map(x =>
              [75, 225, 375, 525, 675, 825, 975].map(y => (
                <g key={`${x}-${y}`}>
                  <circle cx={x} cy={y} r="10" fill="#ef4444" opacity="0.9" />
                  <text
                    x={x + 13} y={y + 6}
                    fill="white" fontSize="22" fontWeight="bold"
                    stroke="black" strokeWidth="4" paintOrder="stroke"
                  >
                    {x},{y}
                  </text>
                </g>
              ))
            )}
          </>
        ) : (
          /* ── MUSCLE OVERLAYS ──────────────────────────────────────────
             All cx/cy values are in 1536×1024 source space.
             Front figure: center x ≈ 595  (calibrate with debug=true)
             Back  figure: center x ≈ 1075 (calibrate with debug=true)
          ─────────────────────────────────────────────────────────────── */
          <>
            {/* FRONT VIEW */}

            {/* Shoulders */}
            <ellipse cx={male ? 442 : 446} cy={175} rx="60" ry="50" {...ms('shoulders')} />
            <ellipse cx={male ? 748 : 744} cy={175} rx="60" ry="50" {...ms('shoulders')} />

            {/* Chest */}
            <ellipse cx={male ? 520 : 522} cy={285} rx={male ? 88 : 80} ry={male ? 68 : 74} {...ms('chest')} />
            <ellipse cx={male ? 670 : 668} cy={285} rx={male ? 88 : 80} ry={male ? 68 : 74} {...ms('chest')} />

            {/* Biceps */}
            <ellipse cx={male ? 404 : 408} cy={372} rx="35" ry="65" {...ms('biceps')} />
            <ellipse cx={male ? 786 : 782} cy={372} rx="35" ry="65" {...ms('biceps')} />

            {/* Triceps (front-visible) */}
            <ellipse cx={male ? 392 : 396} cy={368} rx="27" ry="55" {...ms('triceps')} />
            <ellipse cx={male ? 798 : 794} cy={368} rx="27" ry="55" {...ms('triceps')} />

            {/* Forearms */}
            <ellipse cx={male ? 383 : 386} cy={474} rx="30" ry="58" {...ms('forearms')} />
            <ellipse cx={male ? 807 : 804} cy={474} rx="30" ry="58" {...ms('forearms')} />

            {/* Abs */}
            {male ? (
              <>
                <rect x="549" y="338" width="44" height="50" rx="10" {...ms('abs')} />
                <rect x="603" y="338" width="44" height="50" rx="10" {...ms('abs')} />
                <rect x="551" y="396" width="42" height="48" rx="10" {...ms('abs')} />
                <rect x="605" y="396" width="42" height="48" rx="10" {...ms('abs')} />
                <rect x="553" y="452" width="39" height="44" rx="10" {...ms('abs')} />
                <rect x="607" y="452" width="39" height="44" rx="10" {...ms('abs')} />
              </>
            ) : (
              <>
                <rect x="552" y="360" width="41" height="48" rx="10" {...ms('abs')} />
                <rect x="603" y="360" width="41" height="48" rx="10" {...ms('abs')} />
                <rect x="554" y="416" width="38" height="45" rx="10" {...ms('abs')} />
                <rect x="605" y="416" width="38" height="45" rx="10" {...ms('abs')} />
              </>
            )}

            {/* Legs — quads */}
            <ellipse cx={male ? 537 : 540} cy={638} rx={male ? 74 : 70} ry="86" {...ms('legs')} />
            <ellipse cx={male ? 653 : 650} cy={638} rx={male ? 74 : 70} ry="86" {...ms('legs')} />

            {/* Calves (front) */}
            <ellipse cx={male ? 537 : 540} cy={812} rx="50" ry="65" {...ms('legs')} />
            <ellipse cx={male ? 653 : 650} cy={812} rx="50" ry="65" {...ms('legs')} />

            {/* BACK VIEW */}

            {/* Shoulders (rear) */}
            <ellipse cx={male ? 920 : 924} cy={172} rx="60" ry="50" {...ms('shoulders')} />
            <ellipse cx={male ? 1230 : 1226} cy={172} rx="60" ry="50" {...ms('shoulders')} />

            {/* Trapezius */}
            <ellipse cx={male ? 1075 : 1071} cy={222} rx="135" ry="78" {...ms('back')} />

            {/* Lats */}
            <ellipse cx={male ? 952 : 956} cy={382} rx="74" ry="100" {...ms('back')} />
            <ellipse cx={male ? 1198 : 1194} cy={382} rx="74" ry="100" {...ms('back')} />

            {/* Glutes */}
            <ellipse cx={male ? 1015 : 1020} cy={548} rx="88" ry="70" {...ms('glutes')} />
            <ellipse cx={male ? 1135 : 1130} cy={548} rx="88" ry="70" {...ms('glutes')} />

            {/* Triceps (back view) */}
            <ellipse cx={male ? 883 : 887} cy={366} rx="35" ry="65" {...ms('triceps')} />
            <ellipse cx={male ? 1267 : 1263} cy={366} rx="35" ry="65" {...ms('triceps')} />

            {/* Forearms (back) */}
            <ellipse cx={male ? 870 : 873} cy={474} rx="30" ry="58" {...ms('forearms')} />
            <ellipse cx={male ? 1280 : 1277} cy={474} rx="30" ry="58" {...ms('forearms')} />

            {/* Hamstrings */}
            <ellipse cx={male ? 1012 : 1015} cy={638} rx={male ? 74 : 70} ry="86" {...ms('legs')} />
            <ellipse cx={male ? 1138 : 1135} cy={638} rx={male ? 74 : 70} ry="86" {...ms('legs')} />

            {/* Calves (back) */}
            <ellipse cx={male ? 1012 : 1015} cy={812} rx="50" ry="65" {...ms('legs')} />
            <ellipse cx={male ? 1138 : 1135} cy={812} rx="50" ry="65" {...ms('legs')} />
          </>
        )}
      </svg>
    </div>
  );
}
