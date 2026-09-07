import Lightbox, { useLightboxState } from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import type { ArtworkDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';

interface ArtworkLightboxProps {
  artworks: ArtworkDto[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  authorAlias?: string;
}

const CounterBadge = () => {
  const { slides, currentIndex } = useLightboxState();
  if (slides.length === 0) return null;
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        color: 'var(--yarl__color_button, hsla(0, 0%, 100%, 0.8))',
        lineHeight: 'var(--yarl__icon_size, 32px)',
        padding: 'var(--yarl__button_padding, 8px)',
        userSelect: 'none',
      }}
    >
      {currentIndex + 1} / {slides.length}
    </div>
  );
};

const ArtworkLightbox = ({
  artworks,
  startIndex,
  open,
  onClose,
  authorAlias,
}: ArtworkLightboxProps) => {
  const slides = artworks.map((artwork) => ({
    src: mediaUrl(artwork.previewUrl),
    alt: artwork.title ?? authorAlias ?? 'Artwork',
    ...(artwork.width ? { width: artwork.width } : {}),
    ...(artwork.height ? { height: artwork.height } : {}),
    ...((artwork.title ?? authorAlias) ? { title: artwork.title ?? authorAlias } : {}),
    ...(artwork.description ? { description: artwork.description } : {}),
  }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={startIndex}
      slides={slides}
      plugins={[Captions]}
      toolbar={{ buttons: [<CounterBadge key="counter" />, 'close'] }}
      animation={{ fade: 0, swipe: 500, navigation: 0 }}
    />
  );
};

export default ArtworkLightbox;
