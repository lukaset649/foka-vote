import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

interface CountdownProps {
  targetIso: string;
  className?: string;
}

function formatRemaining(targetIso: string, now: number): string {
  const diff = Math.max(new Date(targetIso).getTime() - now, 0);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1_000) % 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (days > 0 || hours > 0) {
    parts.push(`${hours}h`);
  }
  if (days > 0 || hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

const Countdown = ({ targetIso, className }: CountdownProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return (
    <p className={cn('flex items-center gap-1.5 text-sm font-semibold text-indigo-600', className)}>
      <i className="bi bi-hourglass-split" aria-hidden="true" />
      {formatRemaining(targetIso, now)} remaining
    </p>
  );
};

export default Countdown;
