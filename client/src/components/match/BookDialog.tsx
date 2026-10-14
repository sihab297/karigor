import { Banknote } from 'lucide-react';
import { useId } from 'react';
import { firstName } from '../../lib/names';
import type { Match } from '../../pages/customer/problem-types';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { TextField } from '../TextField';

interface BookDialogProps {
  match: Match;
  serviceName: string;
  when: string;
  near: string;
  price: string | null;
  onClose: () => void;
}

export function BookDialog({ match, serviceName, when, near, price, onClose }: BookDialogProps) {
  const noteId = useId();
  const name = firstName(match.name);
  const rows = [
    ['Service', serviceName],
    ['When', when],
    ['Where', `Your pin near ${near}`],
    ['Rough price', price ? `${price} + parts` : 'Agreed after checking'],
  ];

  return (
    <Modal
      title={`Book ${match.name}?`}
      subtitle={`${name} gets your request and accepts it or says no.`}
      onClose={onClose}
    >
      <dl className="grid gap-1.5 rounded-box bg-paper px-3.5 py-3 text-[15px]">
        {rows.map(([label, text]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-bold">{text}</dd>
          </div>
        ))}
      </dl>
      <TextField
        label="House, road and flat"
        placeholder="e.g. House 12, Road 5, Flat 3B"
        hint={`Only ${name} sees this, and only after accepting.`}
      />
      <div className="grid gap-1.5">
        <label htmlFor={noteId} className="text-sm font-semibold">
          Anything else? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={noteId}
          rows={2}
          placeholder="e.g. Ring the bell twice. The lift is not working."
          className="w-full resize-y rounded-box border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base placeholder:text-muted/70 focus:border-tea focus:outline-none"
        />
      </div>
      <p className="flex items-start gap-2 text-sm text-muted">
        <Banknote size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        You pay in cash after the work is done. Agree on the final price before {name} starts.
      </p>
      <p className="rounded-lg bg-turmeric-soft px-3 py-2 text-sm">
        Sending booking requests opens in the next update.
      </p>
      <Button className="w-full" disabled>
        Send booking request
      </Button>
    </Modal>
  );
}
