'use client';

import { useState, useRef } from 'react';

interface Props {
  text: string;
  maxWidth?: number;
}

export function InfoTooltip({ text, maxWidth = 260 }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  function open() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 7, left: r.left + r.width / 2 });
    setVisible(true);
  }

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={open}
        onMouseLeave={() => setVisible(false)}
        onFocus={open}
        onBlur={() => setVisible(false)}
        onClick={(e) => e.stopPropagation()}
        aria-label="More information"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'default',
          color: 'var(--fg-3)',
          flexShrink: 0,
          verticalAlign: 'middle',
          transition: 'color 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--fg-1)')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--fg-3)')}
      >
        <svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7" />
          <line x1="10" y1="7.5" x2="10" y2="7.5" strokeWidth={2.8} strokeLinecap="round" />
          <path d="M10 10.5v3.5" />
        </svg>
      </button>

      {visible && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'var(--bg-3)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '8px 11px',
            fontSize: 12,
            color: 'var(--fg-1)',
            maxWidth,
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            lineHeight: 1.55,
            pointerEvents: 'none',
            animation: 'fadeIn 0.1s ease-out',
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}
