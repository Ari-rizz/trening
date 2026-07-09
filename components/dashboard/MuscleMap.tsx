'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

// Source image dimensions
const SRC = { w: 1536, h: 1024 };
// Crop: trim text-margin columns from each side, keep full height
const CROP = { x: 120, y: 0, w: 1296, h: 1024 };

// CSS background-image positioning maths
const BG_SIZE_X = (SRC.w / CROP.w) * 100;
const BG_SIZE_Y = (SRC.h / CROP.h) * 100;
const BG_POS_X = CROP.w < SRC.w ? (CROP.x / (SRC.w - CROP.w)) * 100 : 0;
const BG_POS_Y = CROP.h < SRC.h ? (CROP.y / (SRC.h - CROP.h)) * 100 : 0;

// Card background color used for the edge-fade curtains (#18181b = zinc-900)
const CARD_BG = '#18181b';

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);

  const imgSrc = gender === 'female'
    ? '/71550f93-d14b-4ed6-bb09-fe4edda4f925-converted.svg'
    : '/1c21f7c8-7c94-47e8-b2c0-02fcda0c46a1-converted.svg';

  // Returns SVG props that highlight a muscle only when it's in the trained set
  const hl = (muscle: string) => ({
    fill: getMuscleGroupColor(muscle),
    opacity: trained.has(muscle) ? 0.52 : 0,
    filter: trained.has(muscle) ? 'url(#mGlow)' : undefined,
    style: { transition: 'opacity 0.4s ease' } as React.CSSProperties,
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
          {/* Glow filter for active muscle highlights */}
          <filter id="mGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Left curtain gradient: opaque CARD_BG → transparent */}
          <linearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CARD_BG} stopOpacity="1" />
            <stop offset="100%" stopColor={CARD_BG} stopOpacity="0" />
          </linearGradient>

          {/* Right curtain gradient: transparent → opaque CARD_BG */}
          <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CARD_BG} stopOpacity="0" />
            <stop offset="100%" stopColor={CARD_BG} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* ── MUSCLE OVERLAYS ─────────────────────────────────────────────
            All coordinates are in 1536×1024 source pixel space.
            Calibrated from a debug grid overlay on the actual image.

            FRONT figure center x ≈ 490
            BACK  figure center x ≈ 905
        ──────────────────────────────────────────────────────────────── */}

        {/* ── FRONT: Shoulders (deltoids) ── */}
        <ellipse cx={390} cy={222} rx={64} ry={52} {...hl('shoulders')} />
        <ellipse cx={590} cy={222} rx={64} ry={52} {...hl('shoulders')} />

        {/* ── FRONT: Chest (pectorals) ── */}
        <ellipse cx={420} cy={295} rx={82} ry={68} {...hl('chest')} />
        <ellipse cx={560} cy={295} rx={82} ry={68} {...hl('chest')} />

        {/* ── FRONT: Biceps ── */}
        <ellipse cx={250} cy={378} rx={36} ry={68} {...hl('biceps')} />
        <ellipse cx={730} cy={378} rx={36} ry={68} {...hl('biceps')} />

        {/* ── FRONT: Triceps (lateral head visible from front) ── */}
        <ellipse cx={236} cy={374} rx={27} ry={55} {...hl('triceps')} />
        <ellipse cx={744} cy={374} rx={27} ry={55} {...hl('triceps')} />

        {/* ── FRONT: Forearms ── */}
        <ellipse cx={225} cy={490} rx={30} ry={62} {...hl('forearms')} />
        <ellipse cx={755} cy={490} rx={30} ry={62} {...hl('forearms')} />

        {/* ── FRONT: Abs ── */}
        {gender === 'male' ? (
          <>
            <rect x={437} y={378} width={44} height={46} rx={10} {...hl('abs')} />
            <rect x={499} y={378} width={44} height={46} rx={10} {...hl('abs')} />
            <rect x={439} y={430} width={42} height={44} rx={10} {...hl('abs')} />
            <rect x={499} y={430} width={42} height={44} rx={10} {...hl('abs')} />
            <rect x={441} y={480} width={40} height={42} rx={10} {...hl('abs')} />
            <rect x={499} y={480} width={40} height={42} rx={10} {...hl('abs')} />
          </>
        ) : (
          <>
            <rect x={440} y={388} width={42} height={46} rx={10} {...hl('abs')} />
            <rect x={498} y={388} width={42} height={46} rx={10} {...hl('abs')} />
            <rect x={442} y={440} width={40} height={44} rx={10} {...hl('abs')} />
            <rect x={498} y={440} width={40} height={44} rx={10} {...hl('abs')} />
          </>
        )}

        {/* ── FRONT: Quads ── */}
        <ellipse cx={418} cy={655} rx={60} ry={88} {...hl('legs')} />
        <ellipse cx={562} cy={655} rx={60} ry={88} {...hl('legs')} />

        {/* ── FRONT: Calves ── */}
        <ellipse cx={418} cy={848} rx={50} ry={66} {...hl('legs')} />
        <ellipse cx={562} cy={848} rx={50} ry={66} {...hl('legs')} />

        {/* ── BACK: Shoulders (posterior deltoids) ── */}
        <ellipse cx={808} cy={222} rx={64} ry={52} {...hl('shoulders')} />
        <ellipse cx={1002} cy={222} rx={64} ry={52} {...hl('shoulders')} />

        {/* ── BACK: Trapezius ── */}
        <ellipse cx={905} cy={262} rx={140} ry={80} {...hl('back')} />

        {/* ── BACK: Lats ── */}
        <ellipse cx={838} cy={387} rx={72} ry={100} {...hl('back')} />
        <ellipse cx={972} cy={387} rx={72} ry={100} {...hl('back')} />

        {/* ── BACK: Triceps ── */}
        <ellipse cx={700} cy={376} rx={36} ry={68} {...hl('triceps')} />
        <ellipse cx={1110} cy={376} rx={36} ry={68} {...hl('triceps')} />

        {/* ── BACK: Forearms ── */}
        <ellipse cx={678} cy={490} rx={30} ry={62} {...hl('forearms')} />
        <ellipse cx={1132} cy={490} rx={30} ry={62} {...hl('forearms')} />

        {/* ── BACK: Glutes ── */}
        <ellipse cx={870} cy={538} rx={88} ry={70} {...hl('glutes')} />
        <ellipse cx={940} cy={538} rx={88} ry={70} {...hl('glutes')} />

        {/* ── BACK: Hamstrings ── */}
        <ellipse cx={848} cy={655} rx={60} ry={88} {...hl('legs')} />
        <ellipse cx={962} cy={655} rx={60} ry={88} {...hl('legs')} />

        {/* ── BACK: Calves ── */}
        <ellipse cx={848} cy={848} rx={50} ry={66} {...hl('legs')} />
        <ellipse cx={962} cy={848} rx={50} ry={66} {...hl('legs')} />

        {/* ── TEXT-MASKING CURTAINS ────────────────────────────────────────
            These gradient rectangles fade the anatomy label text on both
            outer edges of the source image into the card background color,
            without cropping the figure arms.
        ──────────────────────────────────────────────────────────────── */}
        <rect x={120} y={0} width={180} height={1024} fill="url(#fadeLeft)" />
        <rect x={1236} y={0} width={180} height={1024} fill="url(#fadeRight)" />
      </svg>
    </div>
  );
}
