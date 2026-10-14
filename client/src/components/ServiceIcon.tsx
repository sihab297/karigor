import {
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

const icons: Record<string, LucideIcon> = {
  plumber: Droplet,
  electrician: Zap,
  'gas-fitter': Flame,
  'ac-repair': Snowflake,
  painter: PaintRoller,
  carpenter: Hammer,
  cleaner: Sparkles,
};

export function ServiceIcon({ serviceId, size = 20 }: { serviceId: string; size?: number }) {
  const Icon = icons[serviceId] ?? Wrench;
  return <Icon size={size} aria-hidden="true" className="shrink-0" />;
}
