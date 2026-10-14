import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PriceCard } from '../../components/help/PriceCard';
import { ResultCard } from '../../components/help/ResultCard';
import { SafetyBox } from '../../components/help/SafetyBox';
import { SentBlock } from '../../components/help/SentBlock';
import { ServiceChoice } from '../../components/help/ServiceChoice';
import { StepBar } from '../../components/help/StepBar';
import { Modal } from '../../components/Modal';
import { api, ApiError } from '../../lib/api';
import { formErrorsFrom } from '../../lib/form-errors';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { Service } from '../technician/profile-types';
import type { ProblemReport } from './problem-types';

const cardClass = 'grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5';

export default function ResultPage() {
  useDocumentTitle('Your result');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ProblemReport | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [changing, setChanging] = useState(false);
  const closeChange = useCallback(() => setChanging(false), []);

  useEffect(() => {
    let stillHere = true;
    Promise.all([
      api<{ report: ProblemReport }>(`/problems/${id}`),
      api<{ services: Service[] }>('/services'),
    ])
      .then(([problem, catalog]) => {
        if (!stillHere) return;
        setReport(problem.report);
        setServices(catalog.services);
      })
      .catch((error: unknown) => {
        if (!stillHere) return;
        if (error instanceof ApiError && error.status === 404) setNotFound(true);
        else setLoadError(formErrorsFrom(error).message || "Couldn't load your result.");
      });
    return () => {
      stillHere = false;
    };
  }, [id, attempt]);

  async function chooseService(finalServiceId: string) {
    setSaving(true);
    setSaveError('');
    try {
      const data = await api<{ report: ProblemReport }>(`/problems/${id}`, {
        method: 'PATCH',
        body: { finalServiceId },
      });
      setReport(data.report);
      setChanging(false);
    } catch (error) {
      const found = formErrorsFrom(error);
      setSaveError(found.fields.finalServiceId ?? found.message);
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto grid max-w-2xl gap-3">
        <h1 className="text-3xl font-extrabold">We couldn't find this problem</h1>
        <p className="text-muted">The link may be wrong, or it belongs to another account.</p>
        <Link to="/request" className="font-semibold text-pond underline underline-offset-2">
          Tell us about a new problem
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <Alert>{loadError}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoadError('');
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid place-items-center py-20 text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading your result" />
      </div>
    );
  }

  const ai = report.ai;
  const findService = (serviceId: string | null | undefined): Service | null => {
    if (!serviceId) return null;
    return (
      services.find((s) => s.id === serviceId) ?? {
        id: serviceId,
        name: serviceId === ai?.serviceId ? (ai.serviceName ?? serviceId) : serviceId,
        nameBn: '',
        skills: [],
      }
    );
  };

  const suggested = ai?.understood ? ai.serviceId : null;
  const service = findService(report.finalServiceId ?? suggested ?? report.chosenServiceId);
  const ownChoice = service !== null && service.id !== suggested;
  const mismatch =
    report.mode === 'quick' && ai?.understood && !ai.matchesChosenService && !report.finalServiceId;
  const unsure = ai && (!ai.understood || ai.confidence === 'low');
  const question = unsure && !report.finalServiceId ? ai.followUpQuestion : null;

  // back to the form with their words, so they only add what is missing
  function addDetails() {
    const target =
      report!.mode === 'quick' && report!.chosenServiceId
        ? `/request?service=${report!.chosenServiceId}`
        : '/request';
    navigate(target, { state: { text: report!.text } });
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <h1 className="sr-only">Your result</h1>
      <StepBar step={2} />

      {ai?.urgency === 'emergency' && (
        <SafetyBox tips={ai.safetyTips} emergencyNumber={ai.emergencyNumber ?? '999'} />
      )}

      {saveError && !changing && <Alert>{saveError}</Alert>}

      {mismatch && suggested && report.chosenServiceId && (
        <section className="grid gap-3 rounded-box border-[1.5px] border-tea bg-white px-4 py-4 sm:px-5">
          <h2 className="text-xl font-bold">
            You chose {findService(report.chosenServiceId)!.name}, but this sounds like{' '}
            {findService(suggested)!.name}.
          </h2>
          <p className="text-muted">
            Based on what you wrote{report.text && <>: “{report.text}”</>}. You decide which one to
            book.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => chooseService(suggested)}>
              Use {findService(suggested)!.name}
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => chooseService(report.chosenServiceId!)}
            >
              Keep {findService(report.chosenServiceId)!.name}
            </Button>
          </div>
        </section>
      )}

      {service ? (
        <>
          <ResultCard
            service={service}
            analysis={ai}
            ownChoice={ownChoice}
            suggestedName={findService(suggested)?.name ?? null}
            question={question}
            text={report.text}
            photoUrls={report.photoUrls}
            onChange={() => {
              setSaveError('');
              setChanging(true);
            }}
            onAddDetails={addDetails}
          />
          <PriceCard
            estimate={ownChoice ? null : (ai?.estimate ?? null)}
            lines={ownChoice ? [] : (ai?.priceLines ?? [])}
          />
          <section className="grid gap-1.5 rounded-box border border-dashed border-line px-4 py-4 text-muted sm:px-5">
            <h2 className="text-xl font-bold text-tea">Where and when?</h2>
            <p>
              Next you'll pin your home on the map and pick a time. Then we show the 3 best karigors
              near you. This part is still being built.
            </p>
          </section>
        </>
      ) : (
        <>
          <section className={cardClass}>
            {ai ? (
              <>
                <h2 className="text-[22px] font-bold">We couldn't tell what's wrong yet</h2>
                {question && (
                  <div className="grid gap-2 rounded-box bg-turmeric-soft px-3.5 py-3">
                    <b className="text-sm">Tell us a little more</b>
                    <p className="text-[17px] font-semibold">{question}</p>
                    <Button className="justify-self-start" onClick={addDetails}>
                      Add more details
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-[22px] font-bold">We couldn't check your problem right now</h2>
                <p className="text-muted">
                  That's on our side, not yours. Choose the service below and carry on, or try again
                  in a few minutes.
                </p>
              </>
            )}
            <SentBlock text={report.text} photoUrls={report.photoUrls} />
          </section>
          <section className={cardClass}>
            <h2 className="text-[22px] font-bold">
              {ai ? 'Or choose the service yourself' : 'Which service do you need?'}
            </h2>
            <ServiceChoice
              services={services}
              saving={saving}
              error={saveError}
              onChoose={chooseService}
            />
          </section>
        </>
      )}

      {changing && service && (
        <Modal
          title="Which service do you need?"
          subtitle={
            suggested
              ? `The price we showed is for ${findService(suggested)!.name}. For another service, the karigor tells you the price after checking.`
              : undefined
          }
          onClose={closeChange}
        >
          <ServiceChoice
            services={services}
            current={service.id}
            saving={saving}
            error={saveError}
            onChoose={chooseService}
          />
        </Modal>
      )}
    </div>
  );
}
