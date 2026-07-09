'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

const BG = '#18181b';
const UNTRAINED = '#3a3a42';

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);
  const male = gender !== 'female';

  const mp = (m: string): React.SVGProps<SVGPathElement> => ({
    fill: trained.has(m) ? getMuscleGroupColor(m) : UNTRAINED,
    opacity: trained.has(m) ? 0.92 : 0.6,
    filter: trained.has(m) ? 'url(#mglow)' : undefined,
    style: { transition: 'fill 0.4s ease, opacity 0.4s ease' },
  });

  const mc = (m: string): React.SVGProps<SVGCircleElement> => ({
    fill: trained.has(m) ? getMuscleGroupColor(m) : UNTRAINED,
    opacity: trained.has(m) ? 0.92 : 0.6,
    filter: trained.has(m) ? 'url(#mglow)' : undefined,
    style: { transition: 'fill 0.4s ease, opacity 0.4s ease' },
  });

  return (
    <svg
      viewBox="0 0 100 222"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <filter id="mglow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── BASE SILHOUETTE – drawn first so muscle regions sit on top ── */}

      {/* Neck */}
      <path d="M 45,22 L 44,38 L 56,38 L 55,22 Z" fill={BG} />

      {/* Arms bg */}
      {male ? (
        <>
          <path d="M 19,58 C 13,66 11,84 13,102 L 13,144 L 28,144 L 28,100 C 28,86 28,68 28,58 Z" fill={BG} />
          <path d="M 81,58 C 87,66 89,84 87,102 L 87,144 L 72,144 L 72,100 C 72,86 72,68 72,58 Z" fill={BG} />
        </>
      ) : (
        <>
          <path d="M 21,58 C 15,66 13,84 15,102 L 15,144 L 30,144 L 30,100 C 30,86 30,68 30,58 Z" fill={BG} />
          <path d="M 79,58 C 85,66 87,84 85,102 L 85,144 L 70,144 L 70,100 C 70,86 70,68 70,58 Z" fill={BG} />
        </>
      )}

      {/* Torso bg */}
      {male ? (
        <path d="M 33,40 C 40,36 60,36 67,40 L 70,150 C 66,158 34,158 30,150 Z" fill={BG} />
      ) : (
        <path d="M 34,40 C 41,36 59,36 66,40 L 69,150 C 65,160 35,160 31,150 Z" fill={BG} />
      )}

      {/* Hip bg */}
      {male ? (
        <path d="M 28,152 C 24,162 24,175 28,180 L 50,183 L 72,180 C 76,175 76,162 72,152 Z" fill={BG} />
      ) : (
        <path d="M 22,152 C 18,164 18,177 22,182 L 50,186 L 78,182 C 82,177 82,164 78,152 Z" fill={BG} />
      )}

      {/* Legs bg */}
      {male ? (
        <>
          <path d="M 27,180 C 23,196 22,212 25,222 L 50,222 C 51,212 51,196 51,180 Z" fill={BG} />
          <path d="M 50,180 C 50,196 50,212 51,222 L 75,222 C 78,212 77,196 73,180 Z" fill={BG} />
        </>
      ) : (
        <>
          <path d="M 21,182 C 17,198 16,214 19,222 L 47,222 C 48,214 48,198 48,182 Z" fill={BG} />
          <path d="M 52,182 C 52,198 52,214 53,222 L 81,222 C 84,214 83,198 79,182 Z" fill={BG} />
        </>
      )}

      {/* ── MUSCLE REGIONS ── */}

      {/* BACK – lats visible from front as V-taper side strips */}
      {male ? (
        <>
          <path d="M 32,54 L 37,58 L 36,136 Q 30,142 26,136 L 26,96 Z" {...mp('back')} />
          <path d="M 68,54 L 63,58 L 64,136 Q 70,142 74,136 L 74,96 Z" {...mp('back')} />
        </>
      ) : (
        <>
          <path d="M 33,54 L 38,58 L 37,136 Q 32,141 28,136 L 28,96 Z" {...mp('back')} />
          <path d="M 67,54 L 62,58 L 63,136 Q 68,141 72,136 L 72,96 Z" {...mp('back')} />
        </>
      )}

      {/* GLUTES */}
      {male ? (
        <path d="M 28,154 C 24,162 24,174 28,180 L 50,183 L 72,180 C 76,174 76,162 72,154 Z" {...mp('glutes')} />
      ) : (
        <path d="M 22,154 C 18,164 18,177 22,182 L 50,186 L 78,182 C 82,177 82,164 78,154 Z" {...mp('glutes')} />
      )}

      {/* LEGS – thigh + calf per side */}
      {male ? (
        <>
          <path d="M 28,180 C 24,196 23,212 26,222 L 49,222 C 51,212 51,196 50,180 Z" {...mp('legs')} />
          <path d="M 51,180 C 50,196 50,212 51,222 L 74,222 C 77,212 77,196 72,180 Z" {...mp('legs')} />
        </>
      ) : (
        <>
          <path d="M 22,182 C 18,198 17,214 20,222 L 46,222 C 48,214 48,198 48,182 Z" {...mp('legs')} />
          <path d="M 52,182 C 52,198 52,214 54,222 L 80,222 C 83,214 83,198 78,182 Z" {...mp('legs')} />
        </>
      )}

      {/* ABS */}
      {male ? (
        <path d="M 33,98 Q 50,106 67,98 L 65,152 Q 50,158 35,152 Z" {...mp('abs')} />
      ) : (
        <path d="M 34,98 Q 50,107 66,98 L 64,152 Q 50,158 36,152 Z" {...mp('abs')} />
      )}

      {/* CHEST */}
      {male ? (
        <path d="M 35,44 C 40,40 60,40 65,44 L 67,98 Q 50,105 33,98 Z" {...mp('chest')} />
      ) : (
        /* female chest with subtle bust curve */
        <path d="M 35,44 C 40,40 60,40 65,44 C 65,58 63,80 59,98 C 56,107 44,107 41,98 C 37,80 35,58 35,44 Z" {...mp('chest')} />
      )}

      {/* TRICEPS – outer strip of upper arm */}
      {male ? (
        <>
          <path d="M 27,60 L 30,60 L 30,103 L 27,103 C 25,95 24,78 25,68 Z" {...mp('triceps')} />
          <path d="M 73,60 L 70,60 L 70,103 L 73,103 C 75,95 76,78 75,68 Z" {...mp('triceps')} />
        </>
      ) : (
        <>
          <path d="M 29,60 L 32,60 L 32,103 L 29,103 C 27,95 26,78 27,68 Z" {...mp('triceps')} />
          <path d="M 71,60 L 68,60 L 68,103 L 71,103 C 73,95 74,78 73,68 Z" {...mp('triceps')} />
        </>
      )}

      {/* BICEPS – front of upper arm */}
      {male ? (
        <>
          <path d="M 20,60 C 14,66 11,84 13,102 C 15,112 22,110 24,104 L 26,82 L 26,60 Z" {...mp('biceps')} />
          <path d="M 80,60 C 86,66 89,84 87,102 C 85,112 78,110 76,104 L 74,82 L 74,60 Z" {...mp('biceps')} />
        </>
      ) : (
        <>
          <path d="M 22,60 C 16,66 13,84 15,102 C 17,112 24,110 26,104 L 28,82 L 28,60 Z" {...mp('biceps')} />
          <path d="M 78,60 C 84,66 87,84 85,102 C 83,112 76,110 74,104 L 72,82 L 72,60 Z" {...mp('biceps')} />
        </>
      )}

      {/* FOREARMS */}
      {male ? (
        <>
          <path d="M 17,106 C 11,114 9,132 12,144 C 14,150 22,148 24,142 L 26,106 Z" {...mp('forearms')} />
          <path d="M 83,106 C 89,114 91,132 88,144 C 86,150 78,148 76,142 L 74,106 Z" {...mp('forearms')} />
        </>
      ) : (
        <>
          <path d="M 19,106 C 13,114 11,132 14,144 C 16,150 24,148 26,142 L 28,106 Z" {...mp('forearms')} />
          <path d="M 81,106 C 87,114 89,132 86,144 C 84,150 76,148 74,142 L 72,106 Z" {...mp('forearms')} />
        </>
      )}

      {/* SHOULDERS – deltoid caps */}
      {male ? (
        <>
          <path d="M 29,44 C 18,44 14,54 15,68 C 16,78 22,80 26,76 L 30,64 L 35,46 Z" {...mp('shoulders')} />
          <path d="M 71,44 C 82,44 86,54 85,68 C 84,78 78,80 74,76 L 70,64 L 65,46 Z" {...mp('shoulders')} />
        </>
      ) : (
        <>
          <path d="M 32,44 C 22,44 18,54 19,68 C 20,78 26,80 30,76 L 33,64 L 38,46 Z" {...mp('shoulders')} />
          <path d="M 68,44 C 78,44 82,54 81,68 C 80,78 74,80 70,76 L 67,64 L 62,46 Z" {...mp('shoulders')} />
        </>
      )}

      {/* ── NON-MUSCLE FEATURES drawn last (always on top) ── */}

      {/* Neck */}
      <path d="M 45,22 L 44,38 L 56,38 L 55,22 Z" fill={BG} />

      {/* Head */}
      <circle cx="50" cy="12" r="11" fill={BG} />

      {/* Face detail – eyes */}
      {male ? (
        <>
          <circle cx="46" cy="11" r="1.3" fill="#3f3f46" />
          <circle cx="54" cy="11" r="1.3" fill="#3f3f46" />
          {/* Jawline hint */}
          <path d="M 42,15 Q 50,20 58,15" stroke="#3f3f46" strokeWidth="0.8" fill="none" />
        </>
      ) : (
        <>
          <circle cx="46" cy="11" r="1.3" fill="#3f3f46" />
          <circle cx="54" cy="11" r="1.3" fill="#3f3f46" />
          <path d="M 42,15 Q 50,20 58,15" stroke="#3f3f46" strokeWidth="0.8" fill="none" />
          {/* Female hair suggestion */}
          <path d="M 39,10 Q 38,2 50,1 Q 62,2 61,10" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
