import { Check, Star } from 'lucide-react';
import { firstName } from '../../lib/names';
import type { Match } from '../../pages/customer/problem-types';
import { Button } from '../Button';

function years(count: number) {
  if (count === 0) return 'Under 1 yr';
  return count === 1 ? '1 yr' : `${count} yrs`;
}

interface TechnicianCardProps {
  match: Match;
  onBook: () => void;
}

export function TechnicianCard({ match, onBook }: TechnicianCardProps) {
  const best = match.bestMatch;

  return (
    <article
      aria-label={match.name}
      className={`relative grid gap-3 rounded-box bg-white p-4 ${
        best ? 'border-2 border-turmeric' : 'border border-line'
      }`}
    >
      {best && (
        <span className="absolute -top-3 left-3.5 inline-flex items-center gap-1 rounded-full bg-turmeric px-2.5 py-0.5 text-[13px] font-extrabold">
          <Star size={13} fill="currentColor" aria-hidden="true" />
          Best match
        </span>
      )}

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-turmeric-soft font-heading text-xl font-extrabold"
        >
          {match.name[0]}
        </span>
        <div>
          <h3 className="text-[21px] leading-tight font-bold">{match.name}</h3>
          <p className="text-[15px] text-muted">
            {match.areaName} · {match.distanceKm} km away
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-paper px-2 py-1.5">
          <dt className="text-xs text-muted">Rating</dt>
          <dd className="flex items-center justify-center gap-1 font-bold">
            {match.rating === null ? (
              'New'
            ) : (
              <>
                <Star size={14} className="fill-turmeric" aria-hidden="true" />
                {match.rating}
                <span className="font-normal text-muted">({match.ratingCount})</span>
              </>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-paper px-2 py-1.5">
          <dt className="text-xs text-muted">Jobs on Karigor</dt>
          <dd className="font-bold">{match.jobsDone}</dd>
        </div>
        <div className="rounded-lg bg-paper px-2 py-1.5">
          <dt className="text-xs text-muted">Experience</dt>
          <dd className="font-bold">{years(match.experienceYears)}</dd>
        </div>
      </dl>

      {match.matchedSkills.map((skill) => (
        <p key={skill.id} className="flex items-center gap-1.5 text-[15px] font-semibold text-pond">
          <Check size={16} strokeWidth={2.6} aria-hidden="true" />
          Has the skill: {skill.name}
        </p>
      ))}
      {match.rating === null && (
        <p className="text-sm text-muted">New on Karigor. Checked by our admin, no reviews yet.</p>
      )}

      <Button variant={best ? 'primary' : 'secondary'} className="w-full" onClick={onBook}>
        Book {firstName(match.name)}
      </Button>
    </article>
  );
}
