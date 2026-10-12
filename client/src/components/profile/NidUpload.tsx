import { CircleCheck, ImageUp, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;

interface NidUploadProps {
  hasNidPhoto: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function NidUpload({ hasNidPhoto, file, onFileChange }: NidUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function handleChoose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (chosen.type !== 'image/jpeg' && chosen.type !== 'image/png') {
      setProblem('Use a JPG or PNG photo.');
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setProblem('The photo must be 5 MB or smaller.');
      return;
    }
    setProblem('');
    onFileChange(chosen);
  }

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        id="nid-photo"
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={handleChoose}
        aria-label="NID photo"
      />
      <div className="flex items-center gap-4 rounded-box border-2 border-dashed border-line bg-paper p-4">
        {preview ? (
          <img
            src={preview}
            alt="Chosen NID photo"
            className="h-16 w-24 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="grid h-16 w-24 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted">
            {hasNidPhoto ? (
              <CircleCheck className="text-pond" aria-hidden="true" />
            ) : (
              <ImageUp aria-hidden="true" />
            )}
          </span>
        )}
        <div className="grid gap-0.5">
          <span className="font-semibold">
            {file ? file.name : hasNidPhoto ? 'NID photo uploaded' : 'No photo yet'}
          </span>
          <span className="text-sm text-muted">
            {file ? 'It will upload when you save. ' : ''}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-pond underline underline-offset-2"
            >
              {file || hasNidPhoto ? 'Choose a different photo' : 'Choose a photo'}
            </button>
          </span>
        </div>
      </div>
      {problem && <p className="text-sm font-medium text-alert">{problem}</p>}
      <p className="flex items-start gap-2 text-sm text-muted">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Only the Karigor admin can see this photo, through a link that expires after 5 minutes.
        Customers never see it.
      </p>
    </div>
  );
}
