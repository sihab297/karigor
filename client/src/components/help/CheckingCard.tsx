import { useEffect, useMemo, useRef, useState } from 'react';

const SLOW_AFTER_MS = 8000;

interface CheckingCardProps {
  text: string;
  photos: File[];
}

export function CheckingCard({ text, photos }: CheckingCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [slow, setSlow] = useState(false);
  const previews = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    headingRef.current?.focus();
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="grid gap-3.5 rounded-box border border-line bg-white px-5 py-7 text-center">
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold focus:outline-none">
        Checking your problem…
      </h2>
      <div className="h-1.5 overflow-hidden rounded-full bg-turmeric-soft">
        <div className="h-full w-1/3 animate-slide rounded-full bg-turmeric motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
      </div>
      <p role="status" className="text-muted">
        {slow
          ? 'Still checking. The AI is a little busy right now, almost there.'
          : 'This usually takes 5 to 10 seconds. Please keep this page open.'}
      </p>
      <div className="grid gap-2 rounded-box bg-paper px-3.5 py-3 text-left">
        <span className="text-[13px] text-muted">You wrote</span>
        {text ? (
          <q className="font-semibold">{text}</q>
        ) : (
          <span className="text-muted">Only photos</span>
        )}
        {previews.length > 0 && (
          <div className="flex gap-1.5">
            {previews.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Photo ${i + 1}`}
                className="size-13 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
