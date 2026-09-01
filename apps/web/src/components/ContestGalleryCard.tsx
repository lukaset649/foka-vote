import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ContestDto, SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import { fetchSubmissions } from '../services/submissions';
import ArtworkLightbox from './ArtworkLightbox';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import LinkButton from './ui/LinkButton';
import Spinner from './ui/Spinner';

// Mirrors the grid-cols breakpoints used by the gallery preview grid below.
// Kept to a small column count so preview tiles stay large.
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

  // Narrow (2-column) layouts get a second row so the preview isn't too sparse.
  const rows = columns <= 2 ? 2 : 1;
  return columns * rows;
}

interface ContestGalleryCardProps {
  contest: ContestDto;
}

const ContestGalleryCard = ({ contest }: ContestGalleryCardProps) => {
  const [galleryPreview, setGalleryPreview] = useState<SubmissionDto[] | null>(null);
  const [lightboxSubmission, setLightboxSubmission] = useState<SubmissionDto | null>(null);
  const galleryPreviewCount = useGalleryPreviewCount();

  useEffect(() => {
    let cancelled = false;

    fetchSubmissions(contest.slug)
      .then((data) => {
        if (!cancelled) {
          setGalleryPreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGalleryPreview([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contest.slug]);

  const galleryOverflow = galleryPreview !== null && galleryPreview.length > galleryPreviewCount;
  const galleryVisibleCount = galleryOverflow ? galleryPreviewCount - 1 : galleryPreviewCount;
  const galleryRemaining =
    galleryPreview !== null ? galleryPreview.length - galleryVisibleCount : 0;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Gallery</h2>
          <LinkButton to={`/contest/${contest.slug}/gallery`} variant="secondary" size="sm">
            View gallery
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </LinkButton>
        </div>

        {galleryPreview === null ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : galleryPreview.length === 0 ? (
          <EmptyState icon="bi-images" text="No submissions yet" className="mt-4" />
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {galleryPreview.slice(0, galleryVisibleCount).map((submission) => (
              <li key={submission.id}>
                <button
                  type="button"
                  onClick={() => setLightboxSubmission(submission)}
                  className="group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {submission.artworks[0] && (
                    <img
                      src={mediaUrl(submission.artworks[0].thumbUrl)}
                      alt={submission.alias}
                      className="aspect-square w-full rounded-md object-cover transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105"
                    />
                  )}
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                    {submission.alias}
                  </p>
                </button>
              </li>
            ))}
            {galleryOverflow && (
              <li>
                <Link
                  to={`/contest/${contest.slug}/gallery`}
                  className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-zinc-400 bg-zinc-200 text-lg font-semibold text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  +{galleryRemaining}
                </Link>
              </li>
            )}
          </ul>
        )}
      </Card>

      {lightboxSubmission && (
        <ArtworkLightbox
          artworks={lightboxSubmission.artworks}
          startIndex={0}
          open
          onClose={() => setLightboxSubmission(null)}
          authorAlias={lightboxSubmission.alias}
        />
      )}
    </>
  );
};

export default ContestGalleryCard;
