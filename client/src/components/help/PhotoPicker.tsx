import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

export const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

interface PhotoPickerProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  error?: string;
}

export function PhotoPicker({ photos, onChange, error }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const previews = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function handleChoose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = [...(event.target.files ?? [])];
    event.target.value = '';
    const next = [...photos];
    let note = '';
    for (const file of chosen) {
      if (next.length >= MAX_PHOTOS) {
        note = `You can add up to ${MAX_PHOTOS} photos.`;
        break;
      }
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        note = `"${file.name}" is not a JPG or PNG photo.`;
      } else if (file.size > MAX_BYTES) {
        note = `"${file.name}" is bigger than 5 MB. Choose a smaller photo.`;
      } else {
        next.push(file);
      }
    }
    setProblem(note);
    if (next.length !== photos.length) onChange(next);
  }

  function remove(index: number) {
    setProblem('');
    onChange(photos.filter((_photo, i) => i !== index));
  }

  const message = problem || error;

  return (
    <div className="grid gap-2">
      <span className="font-semibold">
        Photos <span className="font-normal text-muted">(optional, up to {MAX_PHOTOS})</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        tabIndex={-1}
        className="sr-only"
        aria-label="Add photos"
        onChange={handleChoose}
      />
      <div className="grid max-w-90 grid-cols-3 gap-2">
        {previews.map((url, i) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-box border border-line bg-paper"
          >
            <img src={url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-tea/75 text-white hover:bg-tea"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid aspect-square place-content-center justify-items-center gap-1 rounded-box border-[1.5px] border-dashed border-muted/40 bg-paper p-1.5 text-center text-sm font-semibold text-muted hover:border-tea hover:text-tea"
          >
            <ImagePlus size={24} aria-hidden="true" />
            {photos.length > 0 ? 'Add another' : 'Add photo'}
          </button>
        )}
      </div>
      {message && <p className="text-sm font-medium text-alert">{message}</p>}
      <p className="text-sm text-muted">
        A clear photo of the problem helps. JPG or PNG, up to 5 MB each.
      </p>
    </div>
  );
}
