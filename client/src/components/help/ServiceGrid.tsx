import { Check } from 'lucide-react';
import type { Service } from '../../pages/technician/profile-types';
import { ServiceIcon } from '../ServiceIcon';

interface ServiceGridProps {
  services: Service[];
  value: string;
  onChange: (serviceId: string) => void;
  labelledBy: string;
}

export function ServiceGrid({ services, value, onChange, labelledBy }: ServiceGridProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {services.map((service) => {
        const on = service.id === value;
        return (
          <button
            key={service.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(service.id)}
            className={`relative flex min-h-14 items-center gap-2.5 rounded-box border-[1.5px] px-3 py-2 text-left transition-colors ${
              on ? 'border-tea bg-turmeric-soft' : 'border-line bg-white hover:border-muted'
            }`}
          >
            <ServiceIcon serviceId={service.id} size={22} />
            <span className="grid leading-tight">
              <span className="text-[15px] font-bold">{service.name}</span>
              <span lang="bn" className="text-[13px] text-muted">
                {service.nameBn}
              </span>
            </span>
            {on && (
              <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-tea text-white">
                <Check size={13} aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
