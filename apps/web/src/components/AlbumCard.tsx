import { useTranslation } from 'react-i18next';
import type { GalleryAlbumDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import { contestGatePath } from '../services/contests';
import { albumPath } from '../services/gallery';
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
  const targetPath = albumPath(album);

  const itemCountLabel =
    album.kind === 'CONTEST'
      ? t('components.albumCard.submissionsCount', { count: album.itemCount })
      : t('components.albumCard.photosCount', { count: album.itemCount });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
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
            {!album.locked && ` · ${itemCountLabel}`}
          </p>
          {album.description && <p className="mt-2 text-sm text-zinc-600">{album.description}</p>}
        </div>

        <LinkButton to={targetPath} variant="secondary" size="sm">
          {t('components.albumCard.viewAlbum')}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </LinkButton>
      </div>

      {album.locked ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 py-8 text-center">
          <i className="bi bi-lock text-2xl text-zinc-500" aria-hidden="true" />
          <p className="text-sm text-zinc-500">{t('components.albumCard.accessCodeRequired')}</p>
          <LinkButton
            to={contestGatePath(album.slug, targetPath)}
            variant="secondary"
            size="sm"
            className="mt-1"
          >
            {t('components.albumCard.enterAccessCode')}
          </LinkButton>
        </div>
      ) : album.previewThumbUrls.length === 0 ? (
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
          items={album.previewThumbUrls.map((thumbUrl, index) => ({
            id: `${album.id}-${index}`,
            thumbUrl: mediaUrl(thumbUrl),
            alt: album.title,
            to: targetPath,
          }))}
        />
      )}
    </Card>
  );
};

export default AlbumCard;
