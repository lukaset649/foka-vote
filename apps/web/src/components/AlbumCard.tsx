import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryAlbumDto, GalleryAlbumPreviewDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import { albumPath } from '../services/gallery';
import ArtworkLightbox from './ArtworkLightbox';
import Badge from './ui/Badge';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import LinkButton from './ui/LinkButton';
import ThumbnailPreviewGrid from './ui/ThumbnailPreviewGrid';

interface AlbumCardProps {
  album: GalleryAlbumDto;
}

const AlbumCard = ({ album }: AlbumCardProps) => {
  const { t } = useTranslation();
  const [openPreview, setOpenPreview] = useState<GalleryAlbumPreviewDto | null>(null);
  const targetPath = albumPath(album);

  const itemCountLabel =
    album.kind === 'CONTEST'
      ? t('components.albumCard.submissionsCount', { count: album.itemCount })
      : t('components.albumCard.photosCount', { count: album.itemCount });

  return (
    <Card>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">{album.title}</h2>
            <Badge color={album.kind === 'CONTEST' ? 'blue' : 'zinc'}>
              {t(`components.albumCard.kind.${album.kind}`)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {t('components.albumCard.createdOn', {
              date: new Date(album.createdAt).toLocaleDateString(),
            })}
            {` · ${itemCountLabel}`}
          </p>
        </div>

        <LinkButton to={targetPath} variant="secondary" size="sm" className="shrink-0">
          {t('components.albumCard.viewAlbum')}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </LinkButton>
      </div>

      {album.description && <p className="mt-2 text-sm text-zinc-600">{album.description}</p>}

      {album.previews.length === 0 ? (
        <EmptyState
          icon="bi-images"
          text={t('components.albumCard.noPhotosYet')}
          className="mt-4"
        />
      ) : (
        <ThumbnailPreviewGrid
          className="mt-4"
          totalCount={album.itemCount}
          overflowTo={targetPath}
          items={album.previews.map((preview) => ({
            id: preview.id,
            thumbUrl: mediaUrl(preview.thumbUrl),
            alt: preview.label ?? album.title,
            ...(preview.label ? { label: preview.label } : {}),
            onClick: () => setOpenPreview(preview),
          }))}
        />
      )}

      {openPreview && (
        <ArtworkLightbox
          artworks={openPreview.images}
          startIndex={0}
          open
          onClose={() => setOpenPreview(null)}
        />
      )}
    </Card>
  );
};

export default AlbumCard;
