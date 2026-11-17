import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type Image = { src: string; alt: string };
export default function ProductImageGallery({ images }: { images: Image[] }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  if (!images.length) return null;
  const selected = images[active];
  const thumbnails = (prefix: string) => images.map((image, index) => <button key={image.src} type="button" onClick={() => setActive(index)} aria-label={`${prefix} ${image.alt}`} aria-pressed={active === index}><img src={image.src} alt="" width="80" height="80" /></button>);
  return <div className="amazon-gallery">
    <div className="gallery-thumbnails" role="group" aria-label="Product images">{thumbnails('View')}</div>
    <div className="gallery-stage"><button className="gallery-main" type="button" onClick={() => setExpanded(true)} aria-label={`Enlarge ${selected.alt}`}><img src={selected.src} alt={selected.alt} width="568" height="568" fetchPriority="high" /><span>Click to enlarge ↗</span></button><p className="gallery-position" aria-live="polite">Image {active + 1} of {images.length}</p></div>
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="product-image-dialog" aria-describedby={undefined}><DialogTitle className="sr-only">Product image viewer</DialogTitle><div className="gallery-expanded-image"><img src={selected.src} alt={selected.alt} /></div><div className="gallery-thumbnails" role="group" aria-label="Enlarged product images">{thumbnails('Enlarge')}</div></DialogContent></Dialog>
  </div>;
}
