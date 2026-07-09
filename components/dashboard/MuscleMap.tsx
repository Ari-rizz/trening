'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

// viewBox 0 0 200 510, center x=100
// Realistic anatomical proportions — all muscle regions clipped inside body silhouette paths

const BODY = '#26262e';
const UNTRAINED = '#38384a';
const DETAIL = '#44445a';

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);
  const male = gender !== 'female';

  const mp = (m: string): React.SVGProps<SVGPathElement> => ({
    fill: trained.has(m) ? getMuscleGroupColor(m) : UNTRAINED,
    opacity: trained.has(m) ? 0.92 : 0.72,
    filter: trained.has(m) ? 'url(#glow)' : undefined,
    style: { transition: 'fill 0.45s ease, opacity 0.45s ease' } as React.CSSProperties,
  });

  const mr = (m: string): React.SVGProps<SVGRectElement> => ({
    fill: trained.has(m) ? getMuscleGroupColor(m) : UNTRAINED,
    opacity: trained.has(m) ? 0.92 : 0.72,
    filter: trained.has(m) ? 'url(#glow)' : undefined,
    style: { transition: 'fill 0.45s ease, opacity 0.45s ease' } as React.CSSProperties,
  });

  return (
    <svg
      viewBox="0 0 200 510"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ━━━━━━━━━━━━━━━━━━━━━━
          BASE BODY SILHOUETTE
         ━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* NECK */}
      <path
        d={male
          ? 'M 88,65 C 87,74 85,83 84,93 L 116,93 C 115,83 113,74 112,65 Z'
          : 'M 91,65 C 90,74 88,83 87,93 L 113,93 C 112,83 110,74 109,65 Z'}
        fill={BODY}
      />

      {/* LEFT SHOULDER CAP */}
      <path
        d={male
          ? 'M 52,93 C 40,93 28,103 24,121 C 20,139 24,161 34,169 C 40,175 50,176 54,170 L 54,158 Z'
          : 'M 54,93 C 44,93 34,103 30,121 C 26,137 28,157 38,165 C 43,171 52,172 55,167 L 55,156 Z'}
        fill={BODY}
      />

      {/* RIGHT SHOULDER CAP */}
      <path
        d={male
          ? 'M 148,93 C 160,93 172,103 176,121 C 180,139 176,161 166,169 C 160,175 150,176 146,170 L 146,158 Z'
          : 'M 146,93 C 156,93 166,103 170,121 C 174,137 172,157 162,165 C 157,171 148,172 145,167 L 145,156 Z'}
        fill={BODY}
      />

      {/* MAIN TORSO */}
      <path
        d={male
          ? 'M 84,93 C 66,97 50,107 50,130 C 50,150 50,172 52,196 C 52,222 54,252 58,278 C 58,302 58,326 60,344 C 60,354 60,362 62,368 L 138,368 C 140,362 140,354 140,344 C 142,326 142,302 142,278 C 146,252 148,222 148,196 C 150,172 150,150 150,130 C 150,107 134,97 116,93 Z'
          : 'M 86,93 C 68,97 52,109 52,132 C 52,152 52,174 54,198 C 54,224 54,252 58,278 C 56,304 54,330 56,350 C 56,360 58,368 60,374 L 140,374 C 142,368 144,360 144,350 C 146,330 144,304 142,278 C 146,252 146,224 146,198 C 148,174 148,152 148,132 C 148,109 132,97 114,93 Z'}
        fill={BODY}
      />

      {/* LEFT UPPER ARM */}
      <path
        d={male
          ? 'M 36,165 C 24,175 18,197 18,221 C 18,239 20,259 22,275 L 50,277 C 46,261 44,241 44,223 C 44,205 46,183 52,169 Z'
          : 'M 38,163 C 26,173 20,195 20,219 C 20,237 22,257 24,273 L 52,275 C 48,259 46,239 46,221 C 46,203 48,181 54,167 Z'}
        fill={BODY}
      />

      {/* RIGHT UPPER ARM */}
      <path
        d={male
          ? 'M 164,165 C 176,175 182,197 182,221 C 182,239 180,259 178,275 L 150,277 C 154,261 156,241 156,223 C 156,205 154,183 148,169 Z'
          : 'M 162,163 C 174,173 180,195 180,219 C 180,237 178,257 176,273 L 148,275 C 152,259 154,239 154,221 C 154,203 152,181 146,167 Z'}
        fill={BODY}
      />

      {/* LEFT FOREARM */}
      <path
        d={male
          ? 'M 20,277 C 12,295 10,321 12,343 C 12,357 18,367 26,371 L 48,371 C 48,357 48,341 48,327 C 50,311 50,293 50,277 Z'
          : 'M 22,275 C 14,293 12,319 14,341 C 14,355 20,365 28,369 L 50,369 C 50,355 50,339 50,325 C 52,309 52,291 52,275 Z'}
        fill={BODY}
      />

      {/* RIGHT FOREARM */}
      <path
        d={male
          ? 'M 180,277 C 188,295 190,321 188,343 C 188,357 182,367 174,371 L 152,371 C 152,357 152,341 152,327 C 150,311 150,293 150,277 Z'
          : 'M 178,275 C 186,293 188,319 186,341 C 186,355 180,365 172,369 L 150,369 C 150,355 150,339 150,325 C 148,309 148,291 148,275 Z'}
        fill={BODY}
      />

      {/* LEFT THIGH */}
      <path
        d={male
          ? 'M 62,368 C 54,388 48,416 50,442 C 50,454 56,462 64,464 L 98,464 C 104,460 106,452 106,438 C 106,414 104,388 102,368 Z'
          : 'M 58,374 C 48,396 42,426 44,454 C 44,468 50,476 60,478 L 98,478 C 106,474 110,466 110,450 C 110,424 108,396 106,374 Z'}
        fill={BODY}
      />

      {/* RIGHT THIGH */}
      <path
        d={male
          ? 'M 138,368 C 146,388 152,416 150,442 C 150,454 144,462 136,464 L 102,464 C 96,460 94,452 94,438 C 94,414 96,388 98,368 Z'
          : 'M 142,374 C 152,396 158,426 156,454 C 156,468 150,476 140,478 L 102,478 C 94,474 90,466 90,450 C 90,424 92,396 94,374 Z'}
        fill={BODY}
      />

      {/* LEFT CALF */}
      <path
        d={male
          ? 'M 64,466 L 96,466 C 100,484 100,498 94,506 C 90,512 84,514 78,514 L 74,514 C 68,514 62,512 58,506 C 52,498 54,484 64,466 Z'
          : 'M 62,480 L 96,480 C 100,498 100,512 94,520 C 90,526 84,528 78,528 L 74,528 C 68,528 62,526 58,520 C 52,512 52,498 62,480 Z'}
        fill={BODY}
      />

      {/* RIGHT CALF */}
      <path
        d={male
          ? 'M 136,466 L 104,466 C 100,484 100,498 106,506 C 110,512 116,514 122,514 L 126,514 C 132,514 138,512 142,506 C 148,498 146,484 136,466 Z'
          : 'M 138,480 L 104,480 C 100,498 100,512 106,520 C 110,526 116,528 122,528 L 128,528 C 134,528 140,526 144,520 C 150,512 148,498 138,480 Z'}
        fill={BODY}
      />

      {/* HEAD */}
      <ellipse cx="100" cy="37" rx={male ? 28 : 25} ry="30" fill={BODY} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━
          MUSCLE REGIONS
         ━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ── BACK ── trapezius (neck-shoulder slope, visible from front) */}
      <path
        d={male
          ? 'M 88,67 C 80,75 70,85 64,97 C 58,107 54,118 54,130 L 66,130 C 66,118 72,108 80,98 C 90,86 96,76 96,68 Z'
          : 'M 91,67 C 83,75 73,85 67,97 C 61,107 57,118 57,130 L 69,130 C 69,118 75,108 83,98 C 93,86 97,76 97,68 Z'}
        {...mp('back')}
      />
      <path
        d={male
          ? 'M 112,67 C 120,75 130,85 136,97 C 142,107 146,118 146,130 L 134,130 C 134,118 128,108 120,98 C 110,86 104,76 104,68 Z'
          : 'M 109,67 C 117,75 127,85 133,97 C 139,107 143,118 143,130 L 131,130 C 131,118 125,108 117,98 C 107,86 103,76 103,68 Z'}
        {...mp('back')}
      />

      {/* ── BACK ── lats (V-taper side strips, visible as the tapered torso sides) */}
      <path
        d={male
          ? 'M 52,132 C 50,158 50,186 52,214 C 52,240 54,268 58,292 C 62,306 66,316 72,318 L 80,310 C 74,306 68,292 66,268 C 62,244 62,216 62,190 C 62,166 66,140 72,132 Z'
          : 'M 54,134 C 52,160 52,188 54,216 C 54,242 56,270 58,294 C 62,310 66,320 72,322 L 80,314 C 74,310 68,294 66,270 C 62,246 62,218 62,192 C 62,168 66,142 72,134 Z'}
        {...mp('back')}
      />
      <path
        d={male
          ? 'M 148,132 C 150,158 150,186 148,214 C 148,240 146,268 142,292 C 138,306 134,316 128,318 L 120,310 C 126,306 132,292 134,268 C 138,244 138,216 138,190 C 138,166 134,140 128,132 Z'
          : 'M 146,134 C 148,160 148,188 146,216 C 146,242 144,270 142,294 C 138,310 134,320 128,322 L 120,314 C 126,310 132,294 134,270 C 138,246 138,218 138,192 C 138,168 134,142 128,134 Z'}
        {...mp('back')}
      />

      {/* ── GLUTES ── */}
      <path
        d={male
          ? 'M 62,308 C 54,326 52,346 56,362 C 58,368 62,372 66,374 L 134,374 C 138,372 142,368 144,362 C 148,346 146,326 138,308 C 128,296 116,290 100,290 C 84,290 72,296 62,308 Z'
          : 'M 56,310 C 46,330 44,352 48,370 C 50,376 56,380 62,382 L 138,382 C 144,380 150,376 152,370 C 156,352 154,330 144,310 C 132,296 118,290 100,290 C 82,290 68,296 56,310 Z'}
        {...mp('glutes')}
      />

      {/* ── LEGS ── quadriceps (front of thigh) */}
      <path
        d={male
          ? 'M 64,370 C 54,392 48,420 50,446 C 50,458 56,464 64,466 L 98,466 C 104,462 106,454 106,440 C 106,416 104,390 102,370 Z'
          : 'M 60,376 C 48,400 42,432 44,460 C 44,474 50,480 60,482 L 98,482 C 108,478 112,470 112,454 C 112,428 110,400 108,376 Z'}
        {...mp('legs')}
      />
      <path
        d={male
          ? 'M 136,370 C 146,392 152,420 150,446 C 150,458 144,464 136,466 L 102,466 C 96,462 94,454 94,440 C 94,416 96,390 98,370 Z'
          : 'M 140,376 C 152,400 158,432 156,460 C 156,474 150,480 140,482 L 102,482 C 92,478 88,470 88,454 C 88,428 90,400 92,376 Z'}
        {...mp('legs')}
      />

      {/* ── LEGS ── calves */}
      <path
        d={male
          ? 'M 66,468 L 94,468 C 98,486 98,500 92,508 C 88,514 82,516 78,516 L 74,516 C 70,516 64,514 60,508 C 54,500 56,486 66,468 Z'
          : 'M 64,484 L 94,484 C 98,502 98,518 92,526 C 88,532 82,534 78,534 L 74,534 C 70,534 64,532 60,526 C 54,518 54,502 64,484 Z'}
        {...mp('legs')}
      />
      <path
        d={male
          ? 'M 134,468 L 106,468 C 102,486 102,500 108,508 C 112,514 118,516 122,516 L 128,516 C 132,516 138,514 142,508 C 148,500 146,486 134,468 Z'
          : 'M 136,484 L 106,484 C 102,502 102,518 108,526 C 112,532 118,534 122,534 L 128,534 C 132,534 138,532 142,526 C 148,518 146,502 136,484 Z'}
        {...mp('legs')}
      />

      {/* ── ABS ── 6 rectus abdominis blocks (2 cols × 3 rows) */}
      {male ? (
        <>
          <rect x="75" y="182" width="22" height="28" rx="5" {...mr('abs')} />
          <rect x="103" y="182" width="22" height="28" rx="5" {...mr('abs')} />
          <rect x="76" y="216" width="20" height="28" rx="5" {...mr('abs')} />
          <rect x="104" y="216" width="20" height="28" rx="5" {...mr('abs')} />
          <rect x="77" y="250" width="18" height="28" rx="5" {...mr('abs')} />
          <rect x="105" y="250" width="18" height="28" rx="5" {...mr('abs')} />
        </>
      ) : (
        <>
          <rect x="78" y="206" width="19" height="26" rx="5" {...mr('abs')} />
          <rect x="103" y="206" width="19" height="26" rx="5" {...mr('abs')} />
          <rect x="79" y="238" width="17" height="26" rx="5" {...mr('abs')} />
          <rect x="104" y="238" width="17" height="26" rx="5" {...mr('abs')} />
          <rect x="80" y="270" width="15" height="24" rx="5" {...mr('abs')} />
          <rect x="105" y="270" width="15" height="24" rx="5" {...mr('abs')} />
        </>
      )}

      {/* ── CHEST ── pectorals */}
      {male ? (
        <>
          {/* Left pec */}
          <path d="M 56,103 C 64,109 74,121 80,139 C 84,153 84,168 82,178 C 84,184 90,188 98,184 C 102,180 104,174 102,168 C 102,154 96,136 88,120 C 80,106 70,98 60,96 Z" {...mp('chest')} />
          {/* Right pec */}
          <path d="M 144,103 C 136,109 126,121 120,139 C 116,153 116,168 118,178 C 116,184 110,188 102,184 C 98,180 96,174 98,168 C 98,154 104,136 112,120 C 120,106 130,98 140,96 Z" {...mp('chest')} />
        </>
      ) : (
        <>
          {/* Left breast / pec */}
          <path d="M 56,103 C 62,109 68,121 70,139 C 72,157 70,176 70,188 C 72,198 80,206 90,206 C 100,206 104,196 102,186 C 100,174 96,156 90,138 C 84,120 74,106 62,98 Z" {...mp('chest')} />
          {/* Right breast / pec */}
          <path d="M 144,103 C 138,109 132,121 130,139 C 128,157 130,176 130,188 C 128,198 120,206 110,206 C 100,206 96,196 98,186 C 100,174 104,156 110,138 C 116,120 126,106 138,98 Z" {...mp('chest')} />
        </>
      )}

      {/* ── TRICEPS ── (posterior upper arm, visible at outer edge from front) */}
      <path
        d={male
          ? 'M 36,167 C 26,177 18,195 18,221 C 18,241 20,259 22,277 L 36,277 C 32,261 30,241 30,221 C 30,201 32,181 38,171 Z'
          : 'M 38,165 C 28,175 20,193 20,219 C 20,239 22,257 24,275 L 38,275 C 34,259 32,239 32,219 C 32,199 34,179 40,169 Z'}
        {...mp('triceps')}
      />
      <path
        d={male
          ? 'M 164,167 C 174,177 182,195 182,221 C 182,241 180,259 178,277 L 164,277 C 168,261 170,241 170,221 C 170,201 168,181 162,171 Z'
          : 'M 162,165 C 172,175 180,193 180,219 C 180,239 178,257 176,275 L 162,275 C 166,259 168,239 168,219 C 168,199 166,179 160,169 Z'}
        {...mp('triceps')}
      />

      {/* ── BICEPS ── (anterior upper arm, the visible bulge from front) */}
      <path
        d={male
          ? 'M 38,169 C 26,181 20,201 20,225 C 20,243 22,261 26,277 L 48,279 C 44,263 42,245 42,227 C 42,209 44,189 50,171 Z'
          : 'M 40,167 C 28,179 22,199 22,223 C 22,241 24,259 28,275 L 50,277 C 46,261 44,243 44,225 C 44,207 46,187 52,169 Z'}
        {...mp('biceps')}
      />
      <path
        d={male
          ? 'M 162,169 C 174,181 180,201 180,225 C 180,243 178,261 174,277 L 152,279 C 156,263 158,245 158,227 C 158,209 156,189 150,171 Z'
          : 'M 160,167 C 172,179 178,199 178,223 C 178,241 176,259 172,275 L 150,277 C 154,261 156,243 156,225 C 156,207 154,187 148,169 Z'}
        {...mp('biceps')}
      />

      {/* ── FOREARMS ── */}
      <path
        d={male
          ? 'M 20,279 C 12,299 10,325 12,347 C 12,361 18,371 26,373 L 48,373 C 48,359 48,343 48,329 C 50,313 50,295 50,279 Z'
          : 'M 22,277 C 14,297 12,323 14,345 C 14,359 20,369 28,371 L 50,371 C 50,357 50,341 50,327 C 52,311 52,293 52,277 Z'}
        {...mp('forearms')}
      />
      <path
        d={male
          ? 'M 180,279 C 188,299 190,325 188,347 C 188,361 182,371 174,373 L 152,373 C 152,359 152,343 152,329 C 150,313 150,295 150,279 Z'
          : 'M 178,277 C 186,297 188,323 186,345 C 186,359 180,369 172,371 L 150,371 C 150,357 150,341 150,327 C 148,311 148,293 148,277 Z'}
        {...mp('forearms')}
      />

      {/* ── SHOULDERS ── deltoids */}
      <path
        d={male
          ? 'M 54,95 C 42,95 28,105 24,123 C 20,143 24,163 34,171 C 40,177 50,178 54,172 L 54,162 Z'
          : 'M 56,95 C 46,95 34,105 30,123 C 26,141 28,159 38,167 C 43,173 52,174 56,168 L 56,158 Z'}
        {...mp('shoulders')}
      />
      <path
        d={male
          ? 'M 146,95 C 158,95 172,105 176,123 C 180,143 176,163 166,171 C 160,177 150,178 146,172 L 146,162 Z'
          : 'M 144,95 C 154,95 166,105 170,123 C 174,141 172,159 162,167 C 157,173 148,174 144,168 L 144,158 Z'}
        {...mp('shoulders')}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━
          ANATOMICAL DETAIL LINES
         ━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Sternum / linea alba vertical line */}
      <line
        x1="100" y1={male ? 100 : 110}
        x2="100" y2={male ? 182 : 206}
        stroke={DETAIL} strokeWidth="1.5" opacity="0.55"
      />
      {/* Linea alba continues through abs */}
      <line x1="100" y1={male ? 216 : 238} x2="100" y2={male ? 280 : 296}
        stroke={DETAIL} strokeWidth="1.5" opacity="0.45"
      />

      {/* Clavicles */}
      <path
        d={male
          ? 'M 88,97 C 78,93 66,91 58,98'
          : 'M 91,97 C 81,93 69,91 61,98'}
        stroke={DETAIL} strokeWidth="1.8" fill="none" opacity="0.5"
      />
      <path
        d={male
          ? 'M 112,97 C 122,93 134,91 142,98'
          : 'M 109,97 C 119,93 131,91 139,98'}
        stroke={DETAIL} strokeWidth="1.8" fill="none" opacity="0.5"
      />

      {/* Ab horizontal separators */}
      {male ? (
        <>
          <path d="M 75,212 C 82,215 93,215 97,212" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M 103,212 C 107,215 118,215 125,212" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M 76,246 C 82,249 91,249 97,246" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M 103,246 C 109,249 118,249 124,246" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.4" />
        </>
      ) : (
        <>
          <path d="M 78,234 C 83,237 91,237 97,234" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.35" />
          <path d="M 103,234 C 109,237 117,237 122,234" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.35" />
          <path d="M 79,266 C 84,269 90,269 97,266" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.35" />
          <path d="M 103,266 C 110,269 116,269 121,266" stroke={DETAIL} strokeWidth="1" fill="none" opacity="0.35" />
        </>
      )}

      {/* Knee caps */}
      <ellipse cx={male ? 80 : 79} cy={male ? 464 : 478} rx="13" ry="8" fill={DETAIL} opacity="0.65" />
      <ellipse cx={male ? 120 : 121} cy={male ? 464 : 478} rx="13" ry="8" fill={DETAIL} opacity="0.65" />

      {/* Navel */}
      <circle cx="100" cy={male ? 282 : 296} r="3" fill={DETAIL} opacity="0.4" />

      {/* ━━━━━━━━━━━━━━━━━━━━━━
          HEAD (drawn on top)
         ━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Female hair – drawn BEHIND head ellipse */}
      {!male && (
        <path
          d="M 75,22 C 72,10 78,2 100,2 C 122,2 128,10 125,22 C 132,16 136,24 130,34 C 136,28 138,40 130,46 C 128,36 124,28 118,24 C 114,18 108,14 100,14 C 92,14 86,18 82,24 C 76,28 72,36 70,46 C 62,40 64,28 70,34 C 64,24 68,16 75,22 Z"
          fill="#4b4b5c"
        />
      )}

      {/* Head ellipse */}
      <ellipse cx="100" cy="37" rx={male ? 28 : 25} ry="30" fill={BODY} />

      {/* Ear left */}
      <ellipse cx={male ? 72 : 75} cy="37" rx="4.5" ry="7" fill={BODY} />
      {/* Ear right */}
      <ellipse cx={male ? 128 : 125} cy="37" rx="4.5" ry="7" fill={BODY} />

      {/* Jaw / chin definition */}
      <path
        d={male
          ? 'M 74,52 C 80,64 90,70 100,70 C 110,70 120,64 126,52'
          : 'M 77,52 C 82,65 91,72 100,72 C 109,72 118,65 123,52'}
        stroke={DETAIL} strokeWidth="1.5" fill="none" opacity="0.35"
      />

      {/* Eyebrows */}
      <path d={male ? 'M 84,25 C 87,22 92,22 95,25' : 'M 84,24 C 87,21 93,21 96,24'}
        stroke={DETAIL} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d={male ? 'M 105,25 C 108,22 113,22 116,25' : 'M 104,24 C 107,21 113,21 116,24'}
        stroke={DETAIL} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.55" />

      {/* Eyes */}
      <ellipse cx="90" cy="31" rx={male ? 5.5 : 5} ry={male ? 4 : 4.5} fill={DETAIL} opacity="0.75" />
      <ellipse cx="110" cy="31" rx={male ? 5.5 : 5} ry={male ? 4 : 4.5} fill={DETAIL} opacity="0.75" />
      {/* Eye highlights */}
      <circle cx="92" cy="29.5" r="1.5" fill="#6b6b80" opacity="0.5" />
      <circle cx="112" cy="29.5" r="1.5" fill="#6b6b80" opacity="0.5" />

      {/* Nose */}
      <path
        d={male
          ? 'M 100,35 L 96,42 C 97,44 100,45 103,44 L 100,42 Z'
          : 'M 100,35 L 97,42 C 98,44 100,45 102,44 L 100,42 Z'}
        fill={DETAIL} opacity="0.3"
      />

      {/* Lips */}
      <path
        d={male
          ? 'M 92,50 C 96,53 104,53 108,50 M 93,50 C 97,47 103,47 107,50'
          : 'M 90,51 C 95,55 105,55 110,51 M 91,51 C 95,48 105,48 109,51'}
        stroke={DETAIL} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5"
      />

      {/* Female hair strands (drawn on top of head) */}
      {!male && (
        <>
          <path d="M 76,10 C 74,4 80,0 100,0 C 120,0 126,4 124,10" stroke="#4b4b5c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 74,12 C 70,6 76,2 100,2 C 124,2 130,6 126,12" stroke="#3f3f50" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
