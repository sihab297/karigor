import { Phone, TriangleAlert } from 'lucide-react';

interface SafetyBoxProps {
  tips: string[];
  emergencyNumber: string;
}

export function SafetyBox({ tips, emergencyNumber }: SafetyBoxProps) {
  return (
    <section
      role="alert"
      className="grid gap-3 rounded-box border-[1.5px] border-alert bg-alert-soft px-4 py-4 text-alert-ink sm:px-5"
    >
      <h2 className="flex items-center gap-2 text-[22px] font-bold text-alert">
        <TriangleAlert size={24} className="shrink-0" aria-hidden="true" />
        This could be dangerous. Do this first:
      </h2>
      {tips.length > 0 ? (
        <ol className="grid list-decimal gap-1.5 pl-6 font-medium">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      ) : (
        <p className="font-medium">Get everyone to a safe place first.</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <a
          href={`tel:${emergencyNumber}`}
          className="inline-flex h-12 items-center gap-2 rounded-box bg-alert px-5 text-lg font-bold text-white hover:bg-alert-ink"
        >
          <Phone size={20} aria-hidden="true" />
          Call {emergencyNumber}
        </a>
        <span className="text-sm">Free from any phone: police, fire service and ambulance.</span>
      </div>
      <p className="text-[15px]">When everyone is safe, book a karigor below.</p>
    </section>
  );
}
