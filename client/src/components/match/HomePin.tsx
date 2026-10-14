import { LocateFixed, Lock } from 'lucide-react';
import { useId, useState } from 'react';
import { DHAKA_CENTER, nearestArea } from '../../lib/geo';
import { findMyLocation } from '../../lib/locate';
import type { Area, LatLng } from '../../pages/technician/profile-types';
import { LocationPicker } from '../profile/LocationPicker';

interface HomePinProps {
  areas: Area[];
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  error?: string;
}

export function HomePin({ areas, value, onChange, error }: HomePinProps) {
  const labelId = useId();
  const [note, setNote] = useState('');
  const near = value ? nearestArea(value, areas)?.name : undefined;

  function chooseArea(name: string) {
    const area = areas.find((a) => a.name === name);
    if (area) onChange({ lat: area.lat, lng: area.lng });
  }

  function useMyLocation() {
    setNote('Finding you…');
    findMyLocation()
      .then((point) => {
        setNote('');
        onChange(point);
      })
      .catch((problem: Error) => setNote(problem.message));
  }

  return (
    <div className="grid gap-2">
      <span id={labelId} className="font-semibold">
        Your home
      </span>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Your area"
          value={near ?? ''}
          onChange={(event) => chooseArea(event.target.value)}
          className="h-12 min-w-44 rounded-box border-[1.5px] border-line bg-white px-3 text-base focus:border-tea focus:outline-none"
        >
          <option value="" disabled>
            Choose your area
          </option>
          {areas.map((area) => (
            <option key={area.name} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex h-12 items-center gap-2 rounded-box border-[1.5px] border-line bg-white px-3.5 font-semibold hover:border-tea"
        >
          <LocateFixed size={18} aria-hidden="true" />
          Use my location
        </button>
      </div>
      <LocationPicker value={value} center={value ?? DHAKA_CENTER} onChange={onChange} />
      <p role="status" className="text-[15px]">
        {note ||
          (near ? (
            <>
              Pin is near <b>{near}</b>. Drag it to your building if it's not quite right.
            </>
          ) : (
            'Choose your area, use your location, or tap the map.'
          ))}
      </p>
      {error && <p className="text-sm font-medium text-alert">{error}</p>}
      <p className="flex items-start gap-2 text-sm text-muted">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Karigors only see how far away you are. Your house and flat number are shared only with the
        one who accepts.
      </p>
    </div>
  );
}
