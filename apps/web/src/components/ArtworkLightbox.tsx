import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import type { ArtworkDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';

interface ArtworkLightboxProps {
  artworks: ArtworkDto[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  authorAlias?: string;
}

const ArtworkLightbox = ({
  artworks,
  startIndex,
  open,
  onClose,
  authorAlias,
}: ArtworkLightboxProps) => {
  const slides = artworks.map((artwork) => ({
    src: mediaUrl(artwork.fullUrl),
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
      plugins={[Captions, Counter]}
      counter={{ container: { style: { top: 'unset', bottom: 0 } } }}
    />
  );
};

export default ArtworkLightbox;
