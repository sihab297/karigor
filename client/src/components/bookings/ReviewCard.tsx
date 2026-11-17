import { Star } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { api } from '../../lib/api';
import { RATING_WORDS, type Booking, type BookingReview } from '../../lib/bookings';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { firstName } from '../../lib/names';
import { Alert } from '../Alert';
import { Button } from '../Button';

export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={n <= rating ? 'fill-turmeric-dark text-turmeric-dark' : 'text-line'}
        />
      ))}
    </span>
  );
}

// a 1 to 5 star picker that works with a mouse, a finger or the arrow keys
function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const groupRef = useRef<HTMLDivElement>(null);

  function choose(next: number) {
    onChange(next);
    // keep keyboard focus on the star that is now chosen
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus();
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      choose(Math.min(5, value + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      choose(Math.max(1, value - 1));
    }
  }
  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Rating"
      className="flex gap-1"
      onKeyDown={handleKey}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}: ${RATING_WORDS[n]}`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange(n)}
          className="grid size-11 place-items-center rounded-box hover:bg-paper"
        >
          <Star
            size={32}
            aria-hidden="true"
            className={n <= value ? 'fill-turmeric-dark text-turmeric-dark' : 'text-line'}
          />
        </button>
      ))}
    </div>
  );
}

interface ReviewCardProps {
  booking: Booking;
  onReviewed: (review: BookingReview) => void;
}

// the customer's review of a finished job: a form until they send it, then what they wrote
export function ReviewCard({ booking, onReviewed }: ReviewCardProps) {
  const commentId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const name = firstName(booking.technician.name);

  if (booking.review) {
    return (
      <section
        className="grid gap-2 rounded-box border border-line bg-white p-4 sm:p-5"
        aria-label="Your review"
      >
        <h2 className="text-xl font-bold">Your review</h2>
        <Stars rating={booking.review.rating} />
        {booking.review.comment && <p>“{booking.review.comment}”</p>}
        <p className="text-sm text-muted">Thank you. It helps other people choose a karigor.</p>
      </section>
    );
  }
  if (!booking.canReview) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setErrors({ fields: { rating: 'Choose 1 to 5 stars' }, message: '' });
      return;
    }
    setSaving(true);
    setErrors(noErrors);
    try {
      const data = await api<{ review: BookingReview }>(`/bookings/${booking.id}/review`, {
        method: 'POST',
        body: { rating, comment: comment.trim() },
      });
      onReviewed(data.review);
    } catch (error) {
      setErrors(formErrorsFrom(error));
      setSaving(false);
    }
  }

  return (
    <form
      className="grid gap-3 rounded-box border-2 border-turmeric bg-white p-4 sm:p-5"
      aria-label={`Review ${name}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <h2 className="text-xl font-bold">How did {name} do?</h2>
      {errors.message && <Alert>{errors.message}</Alert>}
      <div className="grid gap-1">
        <StarPicker value={rating} onChange={setRating} />
        <span className="text-sm font-semibold">{RATING_WORDS[rating] || 'Tap the stars'}</span>
        {errors.fields.rating && (
          <p className="text-sm font-medium text-alert">{errors.fields.rating}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={commentId} className="text-sm font-semibold">
          Anything to add? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={commentId}
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="e.g. Came on time and explained the price before starting."
          className="w-full resize-y rounded-box border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base placeholder:text-muted/70 focus:border-tea focus:outline-none"
        />
        {errors.fields.comment && (
          <p className="text-sm font-medium text-alert">{errors.fields.comment}</p>
        )}
      </div>
      <Button type="submit" loading={saving} className="justify-self-start">
        Post review
      </Button>
      <p className="text-xs text-muted">
        Your first name and review are shown on {name}'s profile. You can review each job once.
      </p>
    </form>
  );
}
