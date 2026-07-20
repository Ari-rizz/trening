'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface Props {
  trainedMuscles: string[];
}

const INACTIVE = '#3f3f46';

function partStyle(muscle: string, trained: Set<string>) {
  const active = trained.has(muscle);
  const color = active ? getMuscleGroupColor(muscle) : INACTIVE;
  return {
    fill: color,
    transition: 'fill 0.4s ease, filter 0.4s ease',
    filter: active ? `drop-shadow(0 0 5px ${color}cc)` : 'none',
  } as React.CSSProperties;
}

const STROKE = { stroke: '#000', strokeWidth: 1.5, strokeLinejoin: 'round' as const };

const W = 120;
const H = 295;

const SHOULDER_PATH = 'M38.244-.004l1.98 9.232-11.653 2.857-7.474-2.637zm33.032 0l-1.98 9.232 11.653 2.857 7.474-2.637zm21.238 10.54l4.044-2.187 12.656 14 .07 5.33S92.76 10.66 92.515 10.535zm-1.285.58c-.008.28 17.762 18.922 17.762 18.922l.537 16.557-6.157-10.55L91.5 30.988 83.148 15.6zm-74.224-.58L12.962 8.35l-12.656 14-.062 5.325s16.52-17.015 16.764-17.14zm1.285.58C18.3 11.396.528 30.038.528 30.038L-.01 46.595l6.157-10.55 11.87-5.056L26.374 15.6z';

const ARM_PATH = 'M21.12 56.5a1.678 1.678 0 0 1-.427.33l.935 8.224 12.977-13.89 1.2-8.958A168.2 168.2 0 0 0 21.12 56.5zm1.387 12.522l-18.07 48.91 5.757 1.333 19.125-39.44 3.518-22.047zm-5.278-18.96l2.638 18.74-17.2 46.023L.01 113.05l6.644-35.518zm118.015 6.44a1.678 1.678 0 0 0 .426.33l-.934 8.222-12.977-13.89-1.2-8.958A168.2 168.2 0 0 1 135.24 56.5zm-1.39 12.52l18.073 48.91-5.758 1.333-19.132-39.44-3.52-22.05zm5.28-18.96l-2.64 18.74 17.2 46.023 2.658-1.775-6.643-35.518zm-103.1-12.323a1.78 1.78 0 0 1 .407-.24l3.666-27.345L33.07.015l-7.258 10.58-6.16 37.04.566 4.973a151.447 151.447 0 0 1 15.808-14.87zm84.3 0a1.824 1.824 0 0 0-.407-.24l-3.666-27.345L123.3.015l7.258 10.58 6.16 37.04-.566 4.973a151.447 151.447 0 0 0-15.822-14.87zM22.288 8.832l-3.3 35.276-2.2-26.238zm111.79 0l3.3 35.276 2.2-26.238z';

const LEGS_PATH = 'M17.143 138.643l-.664 5.99 4.647 5.77 1.55 9.1 3.1 1.33 2.655-13.755 1.77-4.88-1.55-3.107zm20.582.444l-3.32 9.318-7.082 13.755 1.77 12.647 5.09-14.2 4.205-7.982zm-26.557-12.645l5.09 27.29-3.32-1.777-2.656 8.875zm22.795 42.374l-1.55 4.88-3.32 20.634-.442 27.51 4.65 26.847-.223-34.39 4.87-13.754.663-15.087zM23.34 181.24l1.106 41.267 8.853 33.28-9.628-4.55-16.045-57.8 5.533-36.384zm15.934 80.536l-.664 18.415-1.55 6.435h-4.647l-1.327-4.437-1.55-.222.332 4.437-5.864-1.778-1.55-.887-6.64-1.442-.22-5.214 6.418-10.87 4.426-5.548 10.844-4.437zM13.63 3.076v22.476l15.71 31.073 9.923 30.85L38.23 66.1zm25.49 30.248l.118-.148-.793-2.024L21.9 12.992l-1.242-.44L31.642 40.93zM32.865 44.09l6.812 17.6 2.274-21.596-1.344-3.43zM6.395 61.91l.827 25.34 12.816 35.257-3.928 10.136L3.5 88.133zM30.96 74.69l.345.826 6.47 15.48-4.177 38.342-6.594-3.526 5.715-35.7zm45.5 63.953l.663 5.99-4.647 5.77-1.55 9.1-3.1 1.33-2.655-13.755-1.77-4.88 1.55-3.107zm-20.582.444l3.32 9.318 7.08 13.755-1.77 12.647-5.09-14.2-4.2-7.987zm3.762 29.73l1.55 4.88 3.32 20.633.442 27.51-4.648 26.847.22-34.39-4.867-13.754-.67-15.087zm10.623 12.424l-1.107 41.267-8.852 33.28 9.627-4.55 16.046-57.8-5.533-36.384zM54.33 261.777l.663 18.415 1.546 6.435h4.648l1.328-4.437 1.55-.222-.333 4.437 5.863-1.778 1.55-.887 6.638-1.442.222-5.214-6.418-10.868-4.426-5.547-10.844-4.437zm25.643-258.7v22.476L64.26 56.625l-9.923 30.85L55.37 66.1zM54.48 33.326l-.118-.15.793-2.023L71.7 12.993l1.24-.44L61.96 40.93zm6.255 10.764l-6.812 17.6-2.274-21.595 1.344-3.43zm26.47 17.82l-.827 25.342-12.816 35.256 3.927 10.136 12.61-44.51zM62.64 74.693l-.346.825-6.47 15.48 4.178 38.342 6.594-3.527-5.715-35.7zm19.792 51.75l-5.09 27.29 3.32-1.776 2.655 8.875zM9.495-.007l.827 21.373-7.028 42.308-3.306-34.155zm2.068 27.323L26.24 59.707l3.307 26-6.2 36.58L9.91 85.046l-.827-38.342zM84.103-.01l-.826 21.375 7.03 42.308 3.306-34.155zm-2.066 27.325L67.36 59.707l-3.308 26 6.2 36.58 13.436-37.24.827-38.34z';

function FrontBody({ trained }: { trained: Set<string> }) {
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {/* Shoulders */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 32px)', top: 40, ...partStyle('shoulders', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="64" height="27" viewBox="0 0 109.532 46.594">
        <path d={SHOULDER_PATH} {...STROKE} />
      </svg>
      {/* Biceps */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 45px)', top: 65, ...partStyle('biceps', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="91" height="69" viewBox="0 0 156.344 119.25">
        <path d={ARM_PATH} {...STROKE} />
      </svg>
      {/* Chest */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 25px)', top: 51, ...partStyle('chest', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="50" height="26" viewBox="0 0 86.594 45.063">
        <path d="M19.32 0l-9.225 16.488-10.1 5.056 6.15 4.836 4.832 14.07 11.2 4.616 17.85-8.828-4.452-34.7zm47.934 0l9.225 16.488 10.1 5.056-6.15 4.836-4.833 14.07-11.2 4.616-17.844-8.828 4.45-34.7z" {...STROKE} />
      </svg>
      {/* Abs */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 22px)', top: 75, ...partStyle('abs', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="44" height="62" viewBox="0 0 75.25 107.594">
        <path d="M19.25 7.49l16.6-7.5-.5 12.16-14.943 7.662zm-10.322 8.9l6.9 3.848-.8-9.116zm5.617-8.732L1.32 2.15 6.3 15.6zm-8.17 9.267l9.015 5.514 1.54 11.028-8.795-5.735zm15.53 5.89l.332 8.662 12.286-2.665.664-11.826zm14.61 84.783L33.28 76.062l-.08-20.53-11.654-5.736-1.32 37.5zM22.735 35.64L22.57 46.3l11.787 3.166.166-16.657zm-14.16-5.255L16.49 35.9l1.1 11.25-8.8-7.06zm8.79 22.74l-9.673-7.28-.84 9.78L-.006 68.29l10.564 14.594 5.5.883 1.98-20.735zM56 7.488l-16.6-7.5.5 12.16 14.942 7.66zm10.32 8.9l-6.9 3.847.8-9.116zm-5.617-8.733L73.93 2.148l-4.98 13.447zm8.17 9.267l-9.015 5.514-1.54 11.03 8.8-5.736zm-15.53 5.89l-.332 8.662-12.285-2.665-.664-11.827zm-14.61 84.783l3.234-31.536.082-20.532 11.65-5.735 1.32 37.5zm13.78-71.957l.166 10.66-11.786 3.168-.166-16.657zm14.16-5.256l-7.915 5.514-1.1 11.25 8.794-7.06zm-8.79 22.743l9.673-7.28.84 9.78 6.862 12.66-10.564 14.597-5.5.883-1.975-20.74z" {...STROKE} />
      </svg>
      {/* Legs (quads) */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 119, ...partStyle('legs', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="54" height="166" viewBox="0 0 93.626 286.625">
        <path d={LEGS_PATH} {...STROKE} />
      </svg>
    </div>
  );
}

function BackBody({ trained }: { trained: Set<string> }) {
  const backStyle = partStyle('back', trained);
  const gluteStyle = trained.has('legs') ? partStyle('legs', trained) : partStyle('glutes', trained);
  const legStyle = partStyle('legs', trained);
  const shoulderStyle = partStyle('shoulders', trained);
  const tricepsStyle = partStyle('triceps', trained);

  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {/* ── REAR DELTS ── */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 32px)', top: 40, ...shoulderStyle }}
        xmlns="http://www.w3.org/2000/svg" width="64" height="27" viewBox="0 0 109.532 46.594">
        <path d={SHOULDER_PATH} {...STROKE} />
      </svg>

      {/* ── TRICEPS ── */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 45px)', top: 65, ...tricepsStyle }}
        xmlns="http://www.w3.org/2000/svg" width="91" height="69" viewBox="0 0 156.344 119.25">
        <path d={ARM_PATH} {...STROKE} />
      </svg>

      {/*
        ── UPPER BACK ──
        Single SVG: left lat | trapezius | right lat
        All three shapes share the same fill but are separated by black strokes.
        ViewBox 0 0 100 110, displayed 46×50
      */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 23px)', top: 48, overflow: 'visible', ...backStyle }}
        xmlns="http://www.w3.org/2000/svg" width="46" height="50" viewBox="0 0 100 110">
        {/* Trapezius — central diamond/fan */}
        <path d="M50 0 C55 6 57 14 55 22 C50 26 45 22 45 22 C43 14 45 6 50 0 Z" {...STROKE} />
        {/* Left lat — tall wing, wider at bottom */}
        <path d="M44 4 C36 8 24 20 16 36 C8 52 10 74 18 88 C26 100 40 100 46 88 C50 78 48 48 44 4 Z" {...STROKE} />
        {/* Right lat — mirror */}
        <path d="M56 4 C64 8 76 20 84 36 C92 52 90 74 82 88 C74 100 60 100 54 88 C50 78 52 48 56 4 Z" {...STROKE} />
      </svg>

      {/*
        ── ERECTOR SPINAE (lower back) ──
        3 segments per side, each a rounded pill, separated by black strokes.
        ViewBox 0 0 80 54, displayed 40×27
        Spine gap runs down the centre (x 34–46).
      */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 20px)', top: 96, overflow: 'visible', ...backStyle }}
        xmlns="http://www.w3.org/2000/svg" width="40" height="27" viewBox="0 0 80 54">
        {/* Left column */}
        <path d="M4 1 C10 -1 20 -1 24 2 C26 5 25 11 22 13 C17 15 8 15 4 13 C1 11 1 5 4 1 Z" {...STROKE} />
        <path d="M3 19 C9 17 20 17 24 20 C26 23 25 29 22 31 C17 33 7 33 3 31 C0 29 0 22 3 19 Z" {...STROKE} />
        <path d="M4 37 C9 35 19 35 23 38 C25 41 24 47 21 49 C16 51 7 51 4 49 C1 47 1 40 4 37 Z" {...STROKE} />
        {/* Right column — mirrored */}
        <path d="M56 1 C60 -1 70 -1 76 2 C79 5 79 11 76 13 C71 15 62 15 58 13 C55 11 54 5 56 1 Z" {...STROKE} />
        <path d="M56 19 C60 17 71 17 77 20 C80 23 80 29 77 31 C72 33 61 33 57 31 C54 29 53 22 56 19 Z" {...STROKE} />
        <path d="M57 37 C61 35 71 35 76 38 C79 41 79 47 76 49 C71 51 62 51 58 49 C55 47 54 40 57 37 Z" {...STROKE} />
      </svg>

      {/*
        ── GLUTES ──
        3 stacked segments per side (upper fan, belly, lower taper).
        ViewBox 0 0 100 72, displayed 50×36
        Centre gap at x 44–56.
      */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 25px)', top: 121, overflow: 'visible', ...gluteStyle }}
        xmlns="http://www.w3.org/2000/svg" width="50" height="36" viewBox="0 0 100 72">
        {/* Left upper — fan that narrows toward centre */}
        <path d="M22 1 C12 -1 4 4 1 10 C-1 15 0 22 5 24 C12 27 24 24 32 18 C38 13 39 6 35 3 C31 0 26 1 22 1 Z" {...STROKE} />
        {/* Left belly — widest part */}
        <path d="M4 27 C1 32 0 39 3 44 C8 49 20 51 32 48 C39 45 42 39 41 33 C39 28 34 26 26 26 C15 26 6 27 4 27 Z" {...STROKE} />
        {/* Left lower — tapers toward hamstrings */}
        <path d="M5 51 C2 56 4 63 9 67 C16 72 28 72 38 67 C43 63 43 56 39 52 C34 49 20 49 10 50 C8 50 6 51 5 51 Z" {...STROKE} />
        {/* Right upper */}
        <path d="M78 1 C88 -1 96 4 99 10 C101 15 100 22 95 24 C88 27 76 24 68 18 C62 13 61 6 65 3 C69 0 74 1 78 1 Z" {...STROKE} />
        {/* Right belly */}
        <path d="M96 27 C99 32 100 39 97 44 C92 49 80 51 68 48 C61 45 58 39 59 33 C61 28 66 26 74 26 C85 26 94 27 96 27 Z" {...STROKE} />
        {/* Right lower */}
        <path d="M95 51 C98 56 96 63 91 67 C84 72 72 72 62 67 C57 63 57 56 61 52 C66 49 80 49 90 50 C92 50 94 51 95 51 Z" {...STROKE} />
      </svg>

      {/* ── HAMSTRINGS ── */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 155, ...legStyle }}
        xmlns="http://www.w3.org/2000/svg" width="54" height="140" viewBox="0 0 93.626 286.625">
        <path d={LEGS_PATH} {...STROKE} />
      </svg>
    </div>
  );
}

export function MuscleMap({ trainedMuscles }: Props) {
  const trained = new Set(trainedMuscles);
  return (
    <div className="flex justify-around items-start w-full py-1">
      <FrontBody trained={trained} />
      <BackBody trained={trained} />
    </div>
  );
}
