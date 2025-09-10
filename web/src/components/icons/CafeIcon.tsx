import React from 'react';

type Props = React.SVGProps<SVGSVGElement> & { title?: string };

export default function CafeIcon({ title = 'カフェ対応', className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={className}
      {...rest}
    >
      {/* カップ本体（湯気なし） */}
      <path d="M3 10h11v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z" fill="currentColor" />
      {/* 取っ手 */}
      <path d="M14 11h2.2a2.8 2.8 0 0 1 0 5.6H14v-1.6h2.2a1.2 1.2 0 1 0 0-2.4H14z" fill="currentColor" />
      {/* 受け皿 */}
      <rect x="2" y="18" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}
