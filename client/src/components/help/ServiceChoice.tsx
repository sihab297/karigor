import { useId, useState } from 'react';
import type { Service } from '../../pages/technician/profile-types';
import { Button } from '../Button';
import { ServiceGrid } from './ServiceGrid';

interface ServiceChoiceProps {
  services: Service[];
  current?: string;
  saving: boolean;
  error?: string;
  onChoose: (serviceId: string) => void;
}

export function ServiceChoice({
  services,
  current = '',
  saving,
  error,
  onChoose,
}: ServiceChoiceProps) {
  const labelId = useId();
  const [picked, setPicked] = useState(current);

  return (
    <div className="grid gap-4">
      <span id={labelId} className="sr-only">
        Services
      </span>
      <ServiceGrid services={services} value={picked} onChange={setPicked} labelledBy={labelId} />
      {error && <p className="text-sm font-medium text-alert">{error}</p>}
      <Button
        type="button"
        className="w-full"
        disabled={!picked || picked === current}
        loading={saving}
        onClick={() => onChoose(picked)}
      >
        Use this service
      </Button>
    </div>
  );
}
