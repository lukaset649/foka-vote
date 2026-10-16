import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';
import ThumbnailTile from './ThumbnailTile';

const GALLERY_COLUMN_BREAKPOINTS: Array<{ minWidth: number; columns: number }> = [
  { minWidth: 1024, columns: 4 },
  { minWidth: 640, columns: 3 },
  { minWidth: 0, columns: 2 },
];

function galleryColumnsForWidth(width: number): number {
  return (
    GALLERY_COLUMN_BREAKPOINTS.find((breakpoint) => width >= breakpoint.minWidth)?.columns ?? 2
  );
}

function useGalleryPreviewCount(): number {
  const [columns, setColumns] = useState(() => galleryColumnsForWidth(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setColumns(galleryColumnsForWidth(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rows = columns <= 2 ? 2 : 1;
  return columns * rows;
}

export interface ThumbnailPreviewItem {
  id: string;
  thumbUrl: string | null;
  alt: string;
  label?: string;
  onClick?: () => void;
  to?: string;
}

interface ThumbnailPreviewGridProps {
  items: ThumbnailPreviewItem[];
  totalCount: number;
  overflowTo: string;
  className?: string;
}

const ThumbnailPreviewGrid = ({
  items,
  totalCount,
  overflowTo,
  className,
}: ThumbnailPreviewGridProps) => {
  const previewCount = useGalleryPreviewCount();

  const hasOverflow = totalCount > previewCount;
  const visibleCount = hasOverflow ? previewCount - 1 : previewCount;
  const remaining = totalCount - visibleCount;

  return (
    <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {items.slice(0, visibleCount).map((item) => (
        <li key={item.id}>
          <ThumbnailTile
            thumbUrl={item.thumbUrl}
            alt={item.alt}
            {...(item.onClick ? { onClick: item.onClick } : {})}
            {...(item.to ? { to: item.to } : {})}
          >
            {item.label && (
              <p className="mt-1 truncate text-sm font-medium text-zinc-900">{item.label}</p>
            )}
          </ThumbnailTile>
        </li>
      ))}

      {hasOverflow && (
        <li>
          <Link
            to={overflowTo}
            className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-zinc-400 bg-zinc-200 text-lg font-semibold text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            +{remaining}
          </Link>
        </li>
      )}
    </ul>
  );
};

export default ThumbnailPreviewGrid;
