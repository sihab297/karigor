import { TriangleAlert } from 'lucide-react';
import type { Analysis } from '../../pages/customer/problem-types';
import type { Service } from '../../pages/technician/profile-types';
import { ServiceIcon } from '../ServiceIcon';
import { SentBlock } from './SentBlock';

const tagClass =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-bold';

function UrgencyTag({ urgency }: { urgency: Analysis['urgency'] }) {
  if (urgency === 'emergency') {
    return (
      <span className={`${tagClass} border-alert bg-alert text-white`}>
        <TriangleAlert size={14} aria-hidden="true" />
        Emergency
      </span>
    );
  }
  if (urgency === 'urgent') {
    return (
      <span className={`${tagClass} border-turmeric/60 bg-turmeric-soft`}>
        Urgent: get help today
      </span>
    );
  }
  return <span className={`${tagClass} border-line bg-paper`}>Not urgent</span>;
}

const sureWords = { high: "We're sure", medium: "We're fairly sure", low: "We're not sure" };
const sureDots = { high: 3, medium: 2, low: 1 };

function ConfidenceTag({ confidence }: { confidence: Analysis['confidence'] }) {
  return (
    <span className={`${tagClass} border-line bg-paper`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((dot) => (
          <i
            key={dot}
            className={`size-1.5 rounded-full ${dot <= sureDots[confidence] ? 'bg-pond' : 'bg-line'}`}
          />
        ))}
      </span>
      {sureWords[confidence]}
    </span>
  );
}

interface ResultCardProps {
  service: Service;
  analysis: Analysis | null;
  ownChoice: boolean;
  suggestedName: string | null;
  question: string | null;
  text: string;
  photoUrls: string[];
  onChange: () => void;
  onAddDetails: () => void;
}

export function ResultCard({
  service,
  analysis,
  ownChoice,
  suggestedName,
  question,
  text,
  photoUrls,
  onChange,
  onAddDetails,
}: ResultCardProps) {
  const understood = analysis?.understood === true;

  return (
    <section className="grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-turmeric">
          <ServiceIcon serviceId={service.id} size={24} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[26px] leading-tight font-bold">{service.name}</h2>
          {service.nameBn && (
            <p lang="bn" className="text-[15px] leading-tight text-muted">
              {service.nameBn}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onChange}
          aria-label="Change service"
          className="ml-auto h-10 shrink-0 rounded-box border-[1.5px] border-tea bg-white px-3 text-[15px] font-bold hover:bg-paper"
        >
          Change
        </button>
      </div>

      {understood && (
        <div className="flex flex-wrap gap-1.5">
          <UrgencyTag urgency={analysis.urgency} />
          {!ownChoice && <ConfidenceTag confidence={analysis.confidence} />}
        </div>
      )}
      {understood && <p className="text-[19px] leading-snug font-semibold">{analysis.summary}</p>}
      {ownChoice && (
        <p className="text-sm text-muted">
          You chose this yourself.{suggestedName && ` Our AI suggested ${suggestedName}.`}
        </p>
      )}

      {question && (
        <div className="grid gap-2 rounded-box bg-turmeric-soft px-3.5 py-3">
          <b className="text-sm">To be sure, tell us:</b>
          <p className="text-[17px] font-semibold">{question}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <button
              type="button"
              onClick={onAddDetails}
              className="h-10 rounded-box border-[1.5px] border-tea bg-white px-3 text-[15px] font-bold text-tea hover:bg-paper"
            >
              Add details
            </button>
            or carry on with {service.name}.
          </div>
        </div>
      )}

      <SentBlock text={text} photoUrls={photoUrls} />
    </section>
  );
}
