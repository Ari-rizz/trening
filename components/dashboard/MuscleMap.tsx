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
        <path d={SHOULDER_PATH} />
      </svg>
      {/* Biceps */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 45px)', top: 65, ...partStyle('biceps', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="91" height="69" viewBox="0 0 156.344 119.25">
        <path d={ARM_PATH} />
      </svg>
      {/* Chest */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 25px)', top: 51, ...partStyle('chest', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="50" height="26" viewBox="0 0 86.594 45.063">
        <path d="M19.32 0l-9.225 16.488-10.1 5.056 6.15 4.836 4.832 14.07 11.2 4.616 17.85-8.828-4.452-34.7zm47.934 0l9.225 16.488 10.1 5.056-6.15 4.836-4.833 14.07-11.2 4.616-17.844-8.828 4.45-34.7z" />
      </svg>
      {/* Abs */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 22px)', top: 75, ...partStyle('abs', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="44" height="62" viewBox="0 0 75.25 107.594">
        <path d="M19.25 7.49l16.6-7.5-.5 12.16-14.943 7.662zm-10.322 8.9l6.9 3.848-.8-9.116zm5.617-8.732L1.32 2.15 6.3 15.6zm-8.17 9.267l9.015 5.514 1.54 11.028-8.795-5.735zm15.53 5.89l.332 8.662 12.286-2.665.664-11.826zm14.61 84.783L33.28 76.062l-.08-20.53-11.654-5.736-1.32 37.5zM22.735 35.64L22.57 46.3l11.787 3.166.166-16.657zm-14.16-5.255L16.49 35.9l1.1 11.25-8.8-7.06zm8.79 22.74l-9.673-7.28-.84 9.78L-.006 68.29l10.564 14.594 5.5.883 1.98-20.735zM56 7.488l-16.6-7.5.5 12.16 14.942 7.66zm10.32 8.9l-6.9 3.847.8-9.116zm-5.617-8.733L73.93 2.148l-4.98 13.447zm8.17 9.267l-9.015 5.514-1.54 11.03 8.8-5.736zm-15.53 5.89l-.332 8.662-12.285-2.665-.664-11.827zm-14.61 84.783l3.234-31.536.082-20.532 11.65-5.735 1.32 37.5zm13.78-71.957l.166 10.66-11.786 3.168-.166-16.657zm14.16-5.256l-7.915 5.514-1.1 11.25 8.794-7.06zm-8.79 22.743l9.673-7.28.84 9.78 6.862 12.66-10.564 14.597-5.5.883-1.975-20.74z" />
      </svg>
      {/* Legs (quads) */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 119, ...partStyle('legs', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="54" height="166" viewBox="0 0 93.626 286.625">
        <path d={LEGS_PATH} />
      </svg>
    </div>
  );
}

function BackBody({ trained }: { trained: Set<string> }) {
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {/* Rear delts */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 32px)', top: 40, ...partStyle('shoulders', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="64" height="27" viewBox="0 0 109.532 46.594">
        <path d={SHOULDER_PATH} />
      </svg>
      {/* Triceps */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 45px)', top: 65, ...partStyle('triceps', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="91" height="69" viewBox="0 0 156.344 119.25">
        <path d={ARM_PATH} />
      </svg>
      {/* Back — narrower lats + central trapezius diamond, wider spine gap */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 25px)', top: 51, ...partStyle('back', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="50" height="40" viewBox="0 0 86.594 68">
        <path d="M30 2 l-12 4 l-10 12 l-2 20 l6 18 l12 10 l15-16 l-9-48 Z M56 2 l12 4 l10 12 l2 20 l-6 18 l-12 10 l-15-16 l9-48 Z M43 0 L50 9 L43 23 L36 9 Z" />
      </svg>
      {/* Lower back — 3 segments per side (erector spinae columns) */}
      {[0, 7, 14].map((offset, i) => (
        <svg key={`lb-l-${i}`} style={{ position: 'absolute', left: 'calc(50% - 17px)', top: 89 + offset, ...partStyle('back', trained) }}
          xmlns="http://www.w3.org/2000/svg" width="13" height="5" viewBox="0 0 13 5">
          <path d={`M${1 - i * 0.3} 0 L${12 - i * 0.5} 0 L${11 - i * 0.5} 5 L${i * 0.3} 5 Z`} />
        </svg>
      ))}
      {[0, 7, 14].map((offset, i) => (
        <svg key={`lb-r-${i}`} style={{ position: 'absolute', left: 'calc(50% + 4px)', top: 89 + offset, ...partStyle('back', trained) }}
          xmlns="http://www.w3.org/2000/svg" width="13" height="5" viewBox="0 0 13 5">
          <path d={`M${i * 0.3} 0 L${12 - 1 + i * 0.3} 0 L${13 - i * 0.3} 5 L${1 - i * 0.3} 5 Z`} />
        </svg>
      ))}
      {/* Glutes — 3 segments per side */}
      {(() => {
        const gs = trained.has('legs') ? partStyle('legs', trained) : partStyle('glutes', trained);
        const leftSegs = [
          { top: 109, w: 19, path: 'M18 0 L4 0 Q0 0 0 4 L1 9 L20 7 L20 2 Q20 0 18 0 Z' },
          { top: 118, w: 20, path: 'M0 0 L1 9 L20 7 L20 0 Z' },
          { top: 127, w: 17, path: 'M0 0 L3 8 Q5 10 8 10 L17 8 L20 0 Z' },
        ];
        const rightSegs = [
          { top: 109, w: 19, path: 'M2 0 L0 2 Q0 4 1 7 L20 9 L21 4 Q21 0 18 0 Z' },
          { top: 118, w: 20, path: 'M1 0 L0 7 L19 9 L20 0 Z' },
          { top: 127, w: 17, path: 'M3 0 L0 8 L14 10 Q17 10 19 8 L21 0 Z' },
        ];
        return (
          <>
            {leftSegs.map((s, i) => (
              <svg key={`gl-${i}`} style={{ position: 'absolute', left: 'calc(50% - 22px)', top: s.top, ...gs }}
                xmlns="http://www.w3.org/2000/svg" width={s.w} height="11" viewBox="0 0 21 11">
                <path d={s.path} />
              </svg>
            ))}
            {rightSegs.map((s, i) => (
              <svg key={`gr-${i}`} style={{ position: 'absolute', left: 'calc(50% + 3px)', top: s.top, ...gs }}
                xmlns="http://www.w3.org/2000/svg" width={s.w} height="11" viewBox="0 0 21 11">
                <path d={s.path} />
              </svg>
            ))}
          </>
        );
      })()}
      {/* Hamstrings */}
      <svg style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 129, ...partStyle('legs', trained) }}
        xmlns="http://www.w3.org/2000/svg" width="54" height="166" viewBox="0 0 93.626 286.625">
        <path d={LEGS_PATH} />
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
