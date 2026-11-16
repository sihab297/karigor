import { Banknote, CircleCheck } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { firstName } from '../../lib/names';
import type { Match } from '../../pages/customer/problem-types';
import type { LatLng } from '../../pages/technician/profile-types';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { TextField } from '../TextField';

interface BookDialogProps {
  reportId: string;
  match: Match;
  serviceName: string;
  when: string;
  // the time that was searched; left out when booking "right now"
  whenIso?: string;
  location: LatLng;
  near: string;
  price: string | null;
  onClose: () => void;
}

export function BookDialog({
  reportId,
  match,
  serviceName,
  when,
  whenIso,
  location,
  near,
  price,
  onClose,
}: BookDialogProps) {
  const noteId = useId();
  const name = firstName(match.name);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [sent, setSent] = useState(false);
  const rows = [
    ['Service', serviceName],
    ['When', when],
    ['Where', `Your pin near ${near}`],
    ['Rough price', price ? `${price} + parts` : 'Agreed after checking'],
  ];

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (address.trim().length < 5) {
      setErrors({ fields: { addressText: 'Write your house, road and flat' }, message: '' });
      return;
    }
    setSending(true);
    setErrors(noErrors);
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          problemId: reportId,
          technicianId: match.technicianId,
          location,
          ...(whenIso ? { when: whenIso } : {}),
          addressText: address.trim(),
          note: note.trim(),
        },
      });
      setSent(true);
    } catch (error) {
      setErrors(formErrorsFrom(error));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Modal title="Request sent" onClose={onClose}>
        <div className="grid justify-items-center gap-2 text-center">
          <CircleCheck size={40} className="text-pond" aria-hidden="true" />
          <p className="text-lg font-semibold">{name} has your request.</p>
          <p className="font-semibold">
            {serviceName} · {when}
          </p>
          <p className="text-muted">
            You'll see here when {name} accepts or says no. If {name} says no, you can book another
            karigor.
          </p>
        </div>
        <Link
          to="/bookings"
          className="inline-flex h-12 w-full items-center justify-center rounded-box bg-turmeric px-6 font-bold text-tea hover:bg-turmeric-dark"
        >
          See my bookings
        </Link>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Book ${match.name}?`}
      subtitle={`${name} gets your request and accepts it or says no.`}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={handleSend} noValidate>
        <dl className="grid gap-1.5 rounded-box bg-paper px-3.5 py-3 text-[15px]">
          {rows.map(([label, text]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-bold">{text}</dd>
            </div>
          ))}
        </dl>
        {errors.message && <Alert>{errors.message}</Alert>}
        <TextField
          label="House, road and flat"
          placeholder="e.g. House 12, Road 5, Flat 3B"
          hint={`Only ${name} sees this, and only after accepting.`}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          error={errors.fields.addressText}
          maxLength={200}
          autoComplete="street-address"
        />
        <div className="grid gap-1.5">
          <label htmlFor={noteId} className="text-sm font-semibold">
            Anything else? <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={noteId}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            placeholder="e.g. Ring the bell twice. The lift is not working."
            className="w-full resize-y rounded-box border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base placeholder:text-muted/70 focus:border-tea focus:outline-none"
          />
          {errors.fields.note && (
            <p className="text-sm font-medium text-alert">{errors.fields.note}</p>
          )}
        </div>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Banknote size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          You pay in cash after the work is done. Agree on the final price before {name} starts.
        </p>
        <Button type="submit" className="w-full" loading={sending}>
          Send booking request
        </Button>
      </form>
    </Modal>
  );
}
