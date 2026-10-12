import { useDocumentTitle } from '../lib/use-document-title';

// keeps the menu working until each real page is built
export default function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  useDocumentTitle(title);

  return (
    <div className="grid max-w-2xl gap-3">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="text-muted">{description}</p>
      <p className="rounded-box border border-dashed border-line bg-white px-4 py-3 text-sm text-muted">
        This page is still being built.
      </p>
    </div>
  );
}
