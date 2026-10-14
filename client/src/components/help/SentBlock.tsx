interface SentBlockProps {
  text: string;
  photoUrls: string[];
}

export function SentBlock({ text, photoUrls }: SentBlockProps) {
  return (
    <div className="grid gap-2 border-t border-line pt-3 text-[15px]">
      <div>
        <span className="block text-[13px] text-muted">You wrote</span>
        {text ? <q>{text}</q> : <span className="text-muted">Only photos</span>}
      </div>
      {photoUrls.length > 0 && (
        <div className="flex gap-1.5">
          {photoUrls.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img
                src={url}
                alt={`Your photo ${i + 1}`}
                className="size-14 rounded-lg border border-line object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
