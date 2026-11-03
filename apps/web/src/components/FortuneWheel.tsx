import { useState, useImperativeHandle, type Ref } from 'react';

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 190;
const HUB_RADIUS = 18;
const LABEL_EDGE_PADDING = 14;
const LABEL_SPACE = RADIUS - LABEL_EDGE_PADDING - HUB_RADIUS - 8;
const GLYPH_WIDTH_RATIO = 0.5;
const FULL_TURNS = 6;
const SPIN_DURATION_MS = 5000;
const REDUCED_MOTION_DURATION_MS = 300;
const SEGMENT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9', '#f97316'] as const;

export interface FortuneWheelHandle {
  spinTo: (index: number) => void;
}

interface FortuneWheelProps {
  labels: string[];
  onSpinEnd: () => void;
  ref?: Ref<FortuneWheelHandle>;
}

function polarPoint(angleDeg: number, radius: number): string {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return `${CENTER + radius * Math.cos(radians)} ${CENTER + radius * Math.sin(radians)}`;
}

function segmentPath(startDeg: number, endDeg: number): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${polarPoint(startDeg, RADIUS)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${polarPoint(endDeg, RADIUS)} Z`;
}

function segmentColor(index: number, count: number): string {
  const isLastMatchingFirst =
    index === count - 1 && index % SEGMENT_COLORS.length === 0 && index > 0;
  return (
    SEGMENT_COLORS[(index + (isLastMatchingFirst ? 1 : 0)) % SEGMENT_COLORS.length] ??
    SEGMENT_COLORS[0]
  );
}

function truncate(label: string, fontSize: number): string {
  const maxChars = Math.floor(LABEL_SPACE / (fontSize * GLYPH_WIDTH_RATIO));
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const FortuneWheel = ({ labels, onSpinEnd, ref }: FortuneWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const segmentAngle = 360 / labels.length;
  const fontSize = labels.length > 16 ? 9 : labels.length > 8 ? 12 : 15;

  useImperativeHandle(
    ref,
    () => ({
      spinTo: (index: number) => {
        const jitter = (Math.random() - 0.5) * segmentAngle * 0.7;
        const target = (index + 0.5) * segmentAngle + jitter;
        const reducedMotion = prefersReducedMotion();

        setDurationMs(reducedMotion ? REDUCED_MOTION_DURATION_MS : SPIN_DURATION_MS);
        setRotation((current) => {
          const delta = (((-target - current) % 360) + 360) % 360;
          const turns = reducedMotion && delta > 0 ? 0 : FULL_TURNS;
          return current + turns * 360 + delta;
        });
      },
    }),
    [segmentAngle],
  );

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full drop-shadow-md"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${durationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)`,
        }}
        onTransitionEnd={onSpinEnd}
        aria-hidden="true"
      >
        {labels.length === 1 ? (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={SEGMENT_COLORS[0]} />
        ) : (
          labels.map((label, index) => (
            <path
              key={index}
              d={segmentPath(index * segmentAngle, (index + 1) * segmentAngle)}
              fill={segmentColor(index, labels.length)}
              stroke="#fff"
              strokeWidth={2}
            >
              <title>{label}</title>
            </path>
          ))
        )}
        {labels.map((label, index) => {
          const angle = (index + 0.5) * segmentAngle;
          const restingAngle = (((angle + rotation) % 360) + 360) % 360;
          const flipped = restingAngle > 180;
          return (
            <text
              key={index}
              x={
                flipped
                  ? CENTER - RADIUS + LABEL_EDGE_PADDING
                  : CENTER + RADIUS - LABEL_EDGE_PADDING
              }
              y={CENTER}
              transform={`rotate(${flipped ? angle + 90 : angle - 90} ${CENTER} ${CENTER})`}
              textAnchor={flipped ? 'start' : 'end'}
              dominantBaseline="central"
              fill="#fff"
              fontSize={fontSize}
              fontWeight={600}
            >
              {truncate(label, fontSize)}
            </text>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_RADIUS}
          fill="#fff"
          stroke="#e4e4e7"
          strokeWidth={2}
        />
      </svg>
      <div
        className="absolute top-0 left-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1 border-x-[14px] border-t-[24px] border-x-transparent border-t-zinc-900"
        aria-hidden="true"
      />
    </div>
  );
};

export default FortuneWheel;
