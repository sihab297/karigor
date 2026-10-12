import { Link } from 'react-router';

// temporary mark until the real logo is ready
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? 'size-12 text-3xl' : 'size-10 text-2xl';
  const word = size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <Link to="/" className="inline-flex items-center gap-2.5 rounded-box" aria-label="Karigor home">
      <span
        className={`${mark} grid place-items-center rounded-full bg-turmeric font-bold leading-none text-tea`}
        aria-hidden="true"
      >
        ক
      </span>
      <span className="grid leading-none">
        <span className={`${word} font-heading font-extrabold text-tea`}>Karigor</span>
        <span className="text-sm text-muted">কারিগর</span>
      </span>
    </Link>
  );
}
