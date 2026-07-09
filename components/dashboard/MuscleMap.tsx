'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

// Show x:390–1260, y:20–990 of the 1536×1024 source.
// Removes the text-label columns on both outer edges.
const CROP = { x: 390, y: 20, w: 870, h: 970 };

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
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

  // Front figure center x ≈ 595  (from screenshot: head at ~37% of the 1336px old crop)
  // Back  figure center x ≈ 1075 (from screenshot: head at ~73% of the 1336px old crop)
  // Both figures span y ≈ 50–930 in 1024px space.

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}
    >
      {/* Body image — CSS-cropped to hide text labels */}
      <img
        src={imgSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute pointer-events-none select-none"
        style={{
          width: `${(1536 / CROP.w) * 100}%`,
          height: 'auto',
          left: `${(-CROP.x / CROP.w) * 100}%`,
          top: `${(-CROP.y / CROP.h) * 100}%`,
        }}
      />

      {/* Muscle-group highlight overlay (coordinates in full 1536×1024 source space) */}
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

        {/* ── FRONT VIEW  (center x ≈ 595) ─────────────────── */}

        {/* Shoulders */}
        <ellipse cx={male ? 442 : 446} cy={male ? 175 : 178} rx="60" ry="50" {...ms('shoulders')} />
        <ellipse cx={male ? 748 : 744} cy={male ? 175 : 178} rx="60" ry="50" {...ms('shoulders')} />

        {/* Chest */}
        <ellipse cx={male ? 520 : 522} cy={male ? 285 : 275} rx={male ? 88 : 80} ry={male ? 68 : 74} {...ms('chest')} />
        <ellipse cx={male ? 670 : 668} cy={male ? 285 : 275} rx={male ? 88 : 80} ry={male ? 68 : 74} {...ms('chest')} />

        {/* Biceps */}
        <ellipse cx={male ? 404 : 408} cy={male ? 372 : 366} rx="35" ry="65" {...ms('biceps')} />
        <ellipse cx={male ? 786 : 782} cy={male ? 372 : 366} rx="35" ry="65" {...ms('biceps')} />

        {/* Triceps (front‑visible) */}
        <ellipse cx={male ? 392 : 396} cy={male ? 368 : 362} rx="27" ry="55" {...ms('triceps')} />
        <ellipse cx={male ? 798 : 794} cy={male ? 368 : 362} rx="27" ry="55" {...ms('triceps')} />

        {/* Forearms */}
        <ellipse cx={male ? 383 : 386} cy={male ? 474 : 468} rx="30" ry="58" {...ms('forearms')} />
        <ellipse cx={male ? 807 : 804} cy={male ? 474 : 468} rx="30" ry="58" {...ms('forearms')} />

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
        <ellipse cx={male ? 537 : 540} cy={male ? 638 : 630} rx={male ? 74 : 70} ry="86" {...ms('legs')} />
        <ellipse cx={male ? 653 : 650} cy={male ? 638 : 630} rx={male ? 74 : 70} ry="86" {...ms('legs')} />

        {/* Calves (front) */}
        <ellipse cx={male ? 537 : 540} cy={male ? 812 : 806} rx="50" ry="65" {...ms('legs')} />
        <ellipse cx={male ? 653 : 650} cy={male ? 812 : 806} rx="50" ry="65" {...ms('legs')} />

        {/* ── BACK VIEW  (center x ≈ 1075) ─────────────────── */}

        {/* Shoulders (rear) */}
        <ellipse cx={male ? 920 : 924} cy={male ? 172 : 175} rx="60" ry="50" {...ms('shoulders')} />
        <ellipse cx={male ? 1230 : 1226} cy={male ? 172 : 175} rx="60" ry="50" {...ms('shoulders')} />

        {/* Back — trapezius */}
        <ellipse cx={male ? 1075 : 1071} cy={male ? 222 : 228} rx="135" ry="78" {...ms('back')} />

        {/* Back — lats */}
        <ellipse cx={male ? 952 : 956} cy={male ? 382 : 376} rx="74" ry="100" {...ms('back')} />
        <ellipse cx={male ? 1198 : 1194} cy={male ? 382 : 376} rx="74" ry="100" {...ms('back')} />

        {/* Glutes */}
        <ellipse cx={male ? 1015 : 1020} cy={male ? 548 : 538} rx="88" ry="70" {...ms('glutes')} />
        <ellipse cx={male ? 1135 : 1130} cy={male ? 548 : 538} rx="88" ry="70" {...ms('glutes')} />

        {/* Triceps (back view) */}
        <ellipse cx={male ? 883 : 887} cy={male ? 366 : 360} rx="35" ry="65" {...ms('triceps')} />
        <ellipse cx={male ? 1267 : 1263} cy={male ? 366 : 360} rx="35" ry="65" {...ms('triceps')} />

        {/* Forearms (back) */}
        <ellipse cx={male ? 870 : 873} cy={male ? 474 : 468} rx="30" ry="58" {...ms('forearms')} />
        <ellipse cx={male ? 1280 : 1277} cy={male ? 474 : 468} rx="30" ry="58" {...ms('forearms')} />

        {/* Legs — hamstrings */}
        <ellipse cx={male ? 1012 : 1015} cy={male ? 638 : 630} rx={male ? 74 : 70} ry="86" {...ms('legs')} />
        <ellipse cx={male ? 1138 : 1135} cy={male ? 638 : 630} rx={male ? 74 : 70} ry="86" {...ms('legs')} />

        {/* Calves (back) */}
        <ellipse cx={male ? 1012 : 1015} cy={male ? 812 : 806} rx="50" ry="65" {...ms('legs')} />
        <ellipse cx={male ? 1138 : 1135} cy={male ? 812 : 806} rx="50" ry="65" {...ms('legs')} />
      </svg>
    </div>
  );
}
