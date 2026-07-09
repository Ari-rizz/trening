'use client';

import { getMuscleGroupColor } from '@/lib/exercises-data';

// MIT licensed SVG path data from react-native-body-highlighter
// Source: https://github.com/HichamELBSI/react-native-body-highlighter
const { bodyFront } = require('react-native-body-highlighter/dist/assets/bodyFront');
const { bodyFemaleFront } = require('react-native-body-highlighter/dist/assets/bodyFemaleFront');

type BodyPart = {
  slug: string;
  path?: {
    common?: string[];
    left?: string[];
    right?: string[];
  };
};

// Maps our muscle group names to slugs used in the SVG asset
const SLUG_TO_MUSCLE: Record<string, string> = {
  chest: 'chest',
  biceps: 'biceps',
  triceps: 'triceps',
  deltoids: 'shoulders',
  abs: 'abs',
  obliques: 'abs',
  trapezius: 'back',
  'upper-back': 'back',
  'lower-back': 'back',
  gluteal: 'glutes',
  quadriceps: 'legs',
  hamstring: 'legs',
  calves: 'legs',
  tibialis: 'legs',
  knees: 'legs',
  forearm: 'forearms',
};

const DEFAULT_FILL = '#2a2a35';
const BODY_OUTLINE = '#1a1a24';

interface MuscleMapProps {
  trainedMuscles: string[];
  gender: 'male' | 'female';
}

export function MuscleMap({ trainedMuscles, gender }: MuscleMapProps) {
  const trained = new Set(trainedMuscles);
  const bodyData: BodyPart[] = gender === 'female' ? bodyFemaleFront : bodyFront;

  const getFill = (slug: string): string => {
    const muscle = SLUG_TO_MUSCLE[slug];
    if (muscle && trained.has(muscle)) {
      return getMuscleGroupColor(muscle);
    }
    return DEFAULT_FILL;
  };

  const isActive = (slug: string): boolean => {
    const muscle = SLUG_TO_MUSCLE[slug];
    return !!(muscle && trained.has(muscle));
  };

  return (
    <svg
      viewBox="0 0 724 1448"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="body-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Body outline paths (hair, head, neck, hands, feet, ankles) rendered in base color */}
      {bodyData.map((part) => {
        const active = isActive(part.slug);
        const fill = getFill(part.slug);
        const isOutline = ['hair', 'head', 'neck', 'hands', 'feet', 'ankles'].includes(part.slug);
        const actualFill = isOutline ? BODY_OUTLINE : fill;
        const filter = active && !isOutline ? 'url(#muscle-glow)' : undefined;

        const paths = [
          ...(part.path?.common ?? []),
          ...(part.path?.left ?? []),
          ...(part.path?.right ?? []),
        ];

        return paths.map((d, i) => (
          <path
            key={`${part.slug}-${i}`}
            d={d}
            fill={actualFill}
            filter={filter}
            opacity={active && !isOutline ? 0.95 : isOutline ? 1 : 0.6}
            style={{ transition: 'fill 0.4s ease, opacity 0.4s ease' }}
          />
        ));
      })}
    </svg>
  );
}
