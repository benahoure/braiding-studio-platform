import 'react-image-crop/dist/ReactCrop.css'

import { Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'

import { api } from '../../lib/api'

const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface ImageUploaderProps {
  folder: 'services' | 'portfolio'
  onUploaded: (publicUrl: string) => void
  label?: string
  hint?: string
  aspectRatio?: number
  /** Allow selecting several photos at once; each goes through the crop step. */
  multiple?: boolean
  /** With `multiple`: how many more photos may be added (extra picks are dropped). */
  maxFiles?: number
  /** Return to the empty prompt after each upload — for add-another galleries,
      where keeping the last photo on screen hides the next upload button. */
  resetAfterUpload?: boolean
}

async function getCroppedBlob(image: HTMLImageElement, pixelCrop: PixelCrop, mimeType: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  canvas.width = Math.round(pixelCrop.width * scaleX)
  canvas.height = Math.round(pixelCrop.height * scaleY)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  const outputType = mimeType === 'image/gif' ? 'image/jpeg' : mimeType
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
      outputType,
      0.92,
    )
  })
}

export function ImageUploader({
  folder,
  onUploaded,
  label = 'Click to upload image',
  hint,
  aspectRatio = 4 / 5,
  multiple = false,
  maxFiles,
  resetAfterUpload = false,
}: ImageUploaderProps) {
  const CROP_ASPECT = aspectRatio
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Multi-select queue: remaining files wait here while one is in the crop
  // modal; each confirmed crop uploads, then the next file opens.
  const queueRef = useRef<File[]>([])
  const [queueMeta, setQueueMeta] = useState({ index: 0, total: 0 })

  // crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropMime, setCropMime] = useState('image/jpeg')
  const [cropFilename, setCropFilename] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

  function openCrop(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a JPG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`)
      return
    }
    setError(null)
    setCropMime(file.type)
    setCropFilename(file.name)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropSrc(URL.createObjectURL(file))
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, CROP_ASPECT, width, height),
      width,
      height,
    )
    setCrop(c)
    // pre-compute pixel crop so the button is enabled before the user drags
    setCompletedCrop({
      unit: 'px',
      x: Math.round((c.x / 100) * width),
      y: Math.round((c.y / 100) * height),
      width: Math.round((c.width / 100) * width),
      height: Math.round((c.height / 100) * height),
    })
  }

  async function confirmCrop() {
    if (!imgRef.current || !completedCrop) return
    setError(null)
    const srcToRevoke = cropSrc!
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, cropMime)
      const objectUrl = URL.createObjectURL(blob)
      setPreview(objectUrl)
      setCropSrc(null)
      URL.revokeObjectURL(srcToRevoke)
      setIsUploading(true)
      const croppedFile = new File([blob], cropFilename, { type: blob.type })
      const { uploadUrl, publicUrl } = await api.getUploadUrl(folder, cropFilename, croppedFile.type)
      await api.uploadToPresignedUrl(uploadUrl, croppedFile)
      onUploaded(publicUrl)
      if (resetAfterUpload) {
        URL.revokeObjectURL(objectUrl)
        setPreview(null)
      }
      const next = queueRef.current.shift()
      if (next) {
        setQueueMeta((m) => ({ ...m, index: m.index + 1 }))
        openCrop(next)
      } else {
        setQueueMeta({ index: 0, total: 0 })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setPreview(null)
      queueRef.current = []
      setQueueMeta({ index: 0, total: 0 })
    } finally {
      setIsUploading(false)
    }
  }

  function cancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    queueRef.current = []
    setQueueMeta({ index: 0, total: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    let files = Array.from(list)
    if (!multiple) files = files.slice(0, 1)
    if (multiple && maxFiles !== undefined && files.length > maxFiles) {
      files = files.slice(0, Math.max(maxFiles, 0))
      setError(
        maxFiles > 0
          ? `Photo limit — only the first ${maxFiles} ${maxFiles === 1 ? 'photo' : 'photos'} will be added.`
          : 'Photo limit reached — remove one first.',
      )
      if (files.length === 0) return
    }
    queueRef.current = files.slice(1)
    setQueueMeta({ index: 1, total: files.length })
    openCrop(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload area */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all"
        style={{
          borderColor: preview ? 'rgba(184,145,42,0.6)' : 'rgba(44,24,16,0.2)',
          background: preview ? 'transparent' : 'rgba(44,24,16,0.025)',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="h-52 w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-espresso shadow">
                Change image
              </span>
            </div>
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="text-xs font-semibold text-white">Uploading…</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <div
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'rgba(44,24,16,0.07)' }}
            >
              <Upload size={18} style={{ color: 'rgba(44,24,16,0.4)' }} />
            </div>
            <p className="text-sm font-semibold text-espresso">{label}</p>
            <p className="mt-1 text-[0.7rem] text-mocha/50">
              {hint ?? 'JPG, PNG, WebP · max 10 MB · drag & drop or click'}
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}

      {/* Crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4">
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: '#110a18' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <p
                  className="text-[0.6rem] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(232,120,159,0.8)' }}
                >
                  Crop Photo
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white/90">
                  {queueMeta.total > 1 ? `Photo ${queueMeta.index} of ${queueMeta.total} — ` : ''}
                  Adjust the frame — this is exactly how it will appear on the site
                </p>
              </div>
              <button
                type="button"
                onClick={cancelCrop}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Crop area */}
            <div className="flex max-h-[60vh] items-center justify-center overflow-auto bg-black/50 p-4">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(px) => setCompletedCrop(px)}
                aspect={CROP_ASPECT}
                minWidth={60}
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="Crop preview"
                  style={{ maxHeight: '52vh', maxWidth: '100%' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>

            {/* Footer */}
            <div
              className="flex gap-3 px-5 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                disabled={!completedCrop}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #E8789F, #F5A8C2)', color: '#1F0A15' }}
              >
                Use this crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
