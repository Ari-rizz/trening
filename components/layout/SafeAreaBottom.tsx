'use client';

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  extraPadding?: number;
}

export function SafeAreaBottom({ children, className = '', extraPadding = 0 }: Props) {
  return (
    <div
      className={className}
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${extraPadding}px)` }}
    >
      {children}
    </div>
  );
}
