import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';

interface ThumbnailTileProps {
  thumbUrl: string | null;
  alt: string;
  bordered?: boolean;
  onClick?: () => void;
  to?: string;
  children?: ReactNode;
}

const interactiveClasses =
  'group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

const ThumbnailTile = ({ thumbUrl, alt, bordered, onClick, to, children }: ThumbnailTileProps) => {
  const content = (
    <>
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt={alt}
          className={cn(
            'aspect-square w-full rounded-md object-cover transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105',
            bordered && 'border border-zinc-200',
          )}
        />
      )}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={interactiveClasses}>
        {content}
      </button>
    );
  }

  if (to) {
    return (
      <Link to={to} className={interactiveClasses}>
        {content}
      </Link>
    );
  }

  return content;
};

export default ThumbnailTile;
