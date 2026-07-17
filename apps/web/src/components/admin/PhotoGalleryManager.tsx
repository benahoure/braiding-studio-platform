import { MAX_GALLERY_PHOTOS, resolveAllPhotos } from '../../lib/serviceImages'
import { ImageUploader } from './ImageUploader'

// Shared gallery manager for anything with a cover + up to 4 photos
// (services and portfolio items). Shows thumbnails in the exact order
// clients see them, with per-photo Make cover / Remove actions and an
// uploader that announces which position the next photo will take.

const ORDINALS = ['1st', '2nd', '3rd', '4th']

interface PhotoGalleryManagerProps {
  coverUrl: string
  /** Raw images[] list — may or may not include the cover (legacy items). */
  gallery: string[]
  busy: boolean
  error: string | null
  uploadFolder: 'services' | 'portfolio'
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  onMakeCover: (url: string) => void
}

export function PhotoGalleryManager({
  coverUrl,
  gallery,
  busy,
  error,
  uploadFolder,
  onAdd,
  onRemove,
  onMakeCover,
}: PhotoGalleryManagerProps) {
  // Uncapped on purpose: legacy items may hold more than the public limit,
  // and those extras must stay visible here so they can be removed.
  const ordered = resolveAllPhotos(coverUrl, gallery)

  return (
    <>
      {ordered.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
        {ordered.map((url, position) => {
          const isCover = position === 0
          const shownPublicly = position < MAX_GALLERY_PHOTOS
          return (
            <div key={url} className="group relative overflow-hidden rounded-lg" style={{ aspectRatio: '4/5' }}>
              <img src={url} alt={`Photo ${position + 1}`} className="h-full w-full object-cover" />
              <span
                className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase"
                style={
                  isCover
                    ? { background: 'rgba(191,161,74,0.92)', color: '#1C0D17' }
                    : shownPublicly
                      ? { background: 'rgba(17,17,17,0.72)', color: 'rgba(255,240,247,0.9)' }
                      : { background: 'rgba(220,80,80,0.85)', color: '#FFF' }
                }
              >
                {isCover ? '1st · Cover' : shownPublicly ? ORDINALS[position] : 'Not shown'}
              </span>
              {!isCover && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onMakeCover(url)}
                    className="rounded-full bg-white/95 px-2 py-0.5 text-[0.6rem] font-bold text-espresso disabled:opacity-50"
                  >
                    Make cover
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove(url)}
                    className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold text-white disabled:opacity-50"
                    style={{ background: 'rgba(220,80,80,0.85)' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}
        </div>
      )}

      {ordered.length < MAX_GALLERY_PHOTOS ? (
        <ImageUploader
          folder={uploadFolder}
          onUploaded={onAdd}
          multiple
          maxFiles={MAX_GALLERY_PHOTOS - ordered.length}
          resetAfterUpload
          label={busy ? 'Saving…' : ordered.length === 0 ? 'Upload photos' : `Add photo — will show ${ORDINALS[ordered.length]}`}
          hint={`Pick up to ${MAX_GALLERY_PHOTOS - ordered.length} at once · 4:5 portrait · max 10 MB each`}
        />
      ) : (
        <p className="text-[0.7rem] text-mocha/40">
          Photo limit reached ({MAX_GALLERY_PHOTOS} max) — remove one to add a different angle.
        </p>
      )}

      {error && (
        <p
          className="mt-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#FF9DA6' }}
        >
          {error}
        </p>
      )}
    </>
  )
}
