import {
  Check,
  Droplet,
  Flame,
  Hammer,
  PaintRoller,
  Snowflake,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Service } from '../../pages/technician/profile-types';

const icons: Record<string, LucideIcon> = {
  plumber: Droplet,
  electrician: Zap,
  'gas-fitter': Flame,
  'ac-repair': Snowflake,
  painter: PaintRoller,
  carpenter: Hammer,
  cleaner: Sparkles,
};

export const MAX_SERVICES = 3;

interface ServicePickerProps {
  services: Service[];
  serviceIds: string[];
  skillIds: string[];
  onToggleService: (serviceId: string) => void;
  onToggleSkill: (skillId: string) => void;
}

export function ServicePicker({
  services,
  serviceIds,
  skillIds,
  onToggleService,
  onToggleSkill,
}: ServicePickerProps) {
  const full = serviceIds.length >= MAX_SERVICES;
  const chosen = serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => s !== undefined);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {services.map((service) => {
          const Icon = icons[service.id] ?? Wrench;
          const on = serviceIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => onToggleService(service.id)}
              className={`flex min-h-12 items-center gap-2.5 rounded-box border-[1.5px] px-3 py-2.5 text-left font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? 'border-tea bg-turmeric-soft' : 'border-line bg-white hover:border-muted'
              }`}
            >
              <Icon size={20} aria-hidden="true" className="shrink-0" />
              <span className="flex-1">{service.name}</span>
              {on && (
                <span className="grid size-5 place-items-center rounded-full bg-tea text-white">
                  <Check size={13} aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {full && <p className="text-sm text-muted">You can choose up to {MAX_SERVICES} services.</p>}

      {chosen.map((service) => (
        <div key={service.id} className="grid gap-2.5 rounded-box bg-paper p-3.5">
          <h3 className="font-body text-base font-bold">{service.name}: what can you do?</h3>
          <div className="flex flex-wrap gap-2">
            {service.skills.map((skill) => {
              const on = skillIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggleSkill(skill.id)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-box border-[1.5px] px-3 py-1.5 text-[15px] font-semibold transition-colors ${
                    on ? 'border-tea bg-turmeric' : 'border-line bg-white hover:border-muted'
                  }`}
                >
                  {on && <Check size={15} aria-hidden="true" />}
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {chosen.length > 0 && (
        <p className="text-sm text-muted">
          Smart Matching uses your skills to send you the right jobs.
        </p>
      )}
    </div>
  );
}
