'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

// Crop: x:100-1436, y:10-1014 of the 1536×1024 source — hides text labels on outer edges
const CROP = { x: 100, y: 10, w: 1336, h: 1004 };

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);
  const male = gender !== 'female';

  const imgSrc = male
    ? '/1c21f7c8-7c94-47e8-b2c0-02fcda0c46a1-converted.svg'
    : '/71550f93-d14b-4ed6-bb09-fe4edda4f925-converted.svg';

  const ms = (muscle: string) => ({
    fill: trained.has(muscle) ? getMuscleGroupColor(muscle) : 'transparent',
    opacity: trained.has(muscle) ? 0.45 : 0,
    filter: trained.has(muscle) ? 'url(#mGlow)' : undefined,
    style: { transition: 'fill 0.4s ease, opacity 0.4s ease' } as React.CSSProperties,
  });

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}
    >
      {/* Photorealistic body image — cropped to remove edge text labels */}
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

      {/* Transparent muscle-group overlay — coordinates in 1536×1024 space */}
      <svg
        viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── FRONT VIEW  (figure center ≈ x:384) ── */}

        {/* Shoulders */}
        <ellipse cx={male ? 193 : 197} cy={male ? 175 : 178} rx="68" ry="58" {...ms('shoulders')} />
        <ellipse cx={male ? 575 : 571} cy={male ? 175 : 178} rx="68" ry="58" {...ms('shoulders')} />

        {/* Chest */}
        <ellipse cx={male ? 300 : 302} cy={male ? 268 : 258} rx={male ? 100 : 92} ry={male ? 76 : 82} {...ms('chest')} />
        <ellipse cx={male ? 468 : 466} cy={male ? 268 : 258} rx={male ? 100 : 92} ry={male ? 76 : 82} {...ms('chest')} />

        {/* Biceps */}
        <ellipse cx={male ? 158 : 162} cy={male ? 370 : 365} rx="38" ry="72" {...ms('biceps')} />
        <ellipse cx={male ? 610 : 606} cy={male ? 370 : 365} rx="38" ry="72" {...ms('biceps')} />

        {/* Triceps (front-visible portion) */}
        <ellipse cx={male ? 146 : 150} cy={male ? 365 : 360} rx="29" ry="60" {...ms('triceps')} />
        <ellipse cx={male ? 622 : 618} cy={male ? 365 : 360} rx="29" ry="60" {...ms('triceps')} />

        {/* Forearms */}
        <ellipse cx={male ? 138 : 141} cy={male ? 478 : 472} rx="32" ry="65" {...ms('forearms')} />
        <ellipse cx={male ? 630 : 627} cy={male ? 478 : 472} rx="32" ry="65" {...ms('forearms')} />

        {/* Abs */}
        {male ? (
          <>
            <rect x="322" y="328" width="51" height="58" rx="12" {...ms('abs')} />
            <rect x="395" y="328" width="51" height="58" rx="12" {...ms('abs')} />
            <rect x="325" y="395" width="48" height="55" rx="12" {...ms('abs')} />
            <rect x="397" y="395" width="48" height="55" rx="12" {...ms('abs')} />
            <rect x="328" y="459" width="44" height="50" rx="12" {...ms('abs')} />
            <rect x="400" y="459" width="44" height="50" rx="12" {...ms('abs')} />
          </>
        ) : (
          <>
            <rect x="327" y="353" width="46" height="54" rx="12" {...ms('abs')} />
            <rect x="395" y="353" width="46" height="54" rx="12" {...ms('abs')} />
            <rect x="330" y="416" width="43" height="51" rx="12" {...ms('abs')} />
            <rect x="396" y="416" width="43" height="51" rx="12" {...ms('abs')} />
          </>
        )}

        {/* Legs — quads */}
        <ellipse cx={male ? 314 : 317} cy={male ? 650 : 642} rx={male ? 84 : 80} ry="106" {...ms('legs')} />
        <ellipse cx={male ? 454 : 451} cy={male ? 650 : 642} rx={male ? 84 : 80} ry="106" {...ms('legs')} />

        {/* Calves (front) */}
        <ellipse cx={male ? 314 : 317} cy={male ? 830 : 824} rx="57" ry="78" {...ms('legs')} />
        <ellipse cx={male ? 454 : 451} cy={male ? 830 : 824} rx="57" ry="78" {...ms('legs')} />

        {/* ── BACK VIEW  (figure center ≈ x:1152) ── */}

        {/* Shoulders (rear) */}
        <ellipse cx={male ? 960 : 963} cy={male ? 172 : 176} rx="68" ry="58" {...ms('shoulders')} />
        <ellipse cx={male ? 1344 : 1341} cy={male ? 172 : 176} rx="68" ry="58" {...ms('shoulders')} />

        {/* Back — trapezius */}
        <ellipse cx={male ? 1152 : 1148} cy={male ? 225 : 230} rx="146" ry="84" {...ms('back')} />

        {/* Back — lats */}
        <ellipse cx={male ? 1028 : 1032} cy={male ? 390 : 384} rx="82" ry="112" {...ms('back')} />
        <ellipse cx={male ? 1276 : 1272} cy={male ? 390 : 384} rx="82" ry="112" {...ms('back')} />

        {/* Glutes */}
        <ellipse cx={male ? 1094 : 1099} cy={male ? 555 : 545} rx="97" ry="79" {...ms('glutes')} />
        <ellipse cx={male ? 1210 : 1205} cy={male ? 555 : 545} rx="97" ry="79" {...ms('glutes')} />

        {/* Triceps (back view) */}
        <ellipse cx={male ? 952 : 956} cy={male ? 368 : 362} rx="38" ry="72" {...ms('triceps')} />
        <ellipse cx={male ? 1352 : 1348} cy={male ? 368 : 362} rx="38" ry="72" {...ms('triceps')} />

        {/* Forearms (back) */}
        <ellipse cx={male ? 938 : 941} cy={male ? 478 : 472} rx="32" ry="65" {...ms('forearms')} />
        <ellipse cx={male ? 1366 : 1363} cy={male ? 478 : 472} rx="32" ry="65" {...ms('forearms')} />

        {/* Legs — hamstrings */}
        <ellipse cx={male ? 1080 : 1084} cy={male ? 650 : 642} rx={male ? 84 : 80} ry="106" {...ms('legs')} />
        <ellipse cx={male ? 1224 : 1220} cy={male ? 650 : 642} rx={male ? 84 : 80} ry="106" {...ms('legs')} />

        {/* Calves (back) */}
        <ellipse cx={male ? 1080 : 1084} cy={male ? 830 : 824} rx="57" ry="78" {...ms('legs')} />
        <ellipse cx={male ? 1224 : 1220} cy={male ? 830 : 824} rx="57" ry="78" {...ms('legs')} />
      </svg>
    </div>
  );
}
