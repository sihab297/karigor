import {
  ArrowRight,
  LayoutGrid,
  LoaderCircle,
  Lock,
  PenLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { CheckingCard } from '../../components/help/CheckingCard';
import { PhotoPicker } from '../../components/help/PhotoPicker';
import { QuickFields } from '../../components/help/QuickFields';
import { StepBar } from '../../components/help/StepBar';
import { api, ApiError } from '../../lib/api';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { Service } from '../technician/profile-types';
import type { ProblemReport } from './problem-types';

type Mode = 'describe' | 'quick';

const tabs: { mode: Mode; title: string; note: string; icon: LucideIcon }[] = [
  { mode: 'describe', title: 'Describe it', note: 'Not sure who to call', icon: PenLine },
  { mode: 'quick', title: 'I know the service', note: 'Pick from a list', icon: LayoutGrid },
];

// one in each language, so people see that all three work
const examples = ['ফ্যান ঘুরছে না', 'AC theke pani porche', 'Bathroom drain is blocked'];

const photoErrorCodes = ['WRONG_FILE_TYPE', 'FILE_TOO_LARGE', 'TOO_MANY_FILES'];

export default function GetHelpPage() {
  useDocumentTitle('Get help');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // e.g. /request?service=plumber from a service button on the home page
  const startService = searchParams.get('service') ?? '';
  const [mode, setMode] = useState<Mode>(startService ? 'quick' : 'describe');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [serviceId, setServiceId] = useState(startService);
  const [line, setLine] = useState('');
  const [services, setServices] = useState<Service[] | null>(null);
  const [servicesError, setServicesError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [sending, setSending] = useState(false);
  const textId = useId();
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ describe: null, quick: null });

  useEffect(() => {
    let stillHere = true;
    api<{ services: Service[] }>('/services')
      .then((data) => {
        if (stillHere) setServices(data.services);
      })
      .catch((error: unknown) => {
        if (stillHere) {
          setServicesError(formErrorsFrom(error).message || "Couldn't load the services.");
        }
      });
    return () => {
      stillHere = false;
    };
  }, [attempt]);

  const chosen = services?.find((s) => s.id === serviceId);

  const clearField = (field: string) =>
    setErrors((current) => ({
      ...current,
      fields: Object.fromEntries(Object.entries(current.fields).filter(([key]) => key !== field)),
    }));

  function switchMode(next: Mode) {
    setMode(next);
    setErrors(noErrors);
  }

  function handleTabKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next = mode === 'describe' ? 'quick' : 'describe';
    switchMode(next);
    tabRefs.current[next]?.focus();
  }

  function checkForm(): Record<string, string> {
    if (mode === 'describe') {
      const words = text.trim();
      if (!words && photos.length === 0) return { text: 'Tell us the problem or add a photo' };
      if (words && words.length < 3) return { text: 'Write a little more' };
      return {};
    }
    if (!chosen) return { chosenServiceId: 'Choose a service' };
    if (line.trim().length < 3) return { text: 'Tap one above or write a few words' };
    return {};
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const fields = checkForm();
    if (Object.keys(fields).length > 0) {
      setErrors({ fields, message: '' });
      return;
    }

    const body = new FormData();
    if (mode === 'describe') {
      body.append('text', text.trim());
      photos.forEach((photo) => body.append('photos', photo));
    } else {
      body.append('text', line.trim());
      body.append('chosenServiceId', serviceId);
    }

    setErrors(noErrors);
    setSending(true);
    try {
      const data = await api<{ report: ProblemReport }>('/problems/analyze', {
        method: 'POST',
        body,
      });
      navigate(`/request/${data.report.id}`);
    } catch (error) {
      setErrors(
        error instanceof ApiError && photoErrorCodes.includes(error.code)
          ? { fields: { photos: error.message }, message: '' }
          : formErrorsFrom(error),
      );
      setSending(false);
    }
  }

  if (sending) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4">
        <StepBar step={1} />
        <CheckingCard
          text={mode === 'describe' ? text.trim() : `${chosen?.name}: ${line.trim()}`}
          photos={mode === 'describe' ? photos : []}
        />
      </div>
    );
  }

  const textError = errors.fields.text;

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <StepBar step={1} />
      <div className="grid gap-1">
        <h1 className="text-3xl font-extrabold sm:text-4xl">What needs fixing?</h1>
        <p className="text-muted">
          Write in Bangla, English or Banglish. We'll tell you who to call and roughly what it
          costs.
        </p>
      </div>

      {errors.message && <Alert>{errors.message}</Alert>}

      <div role="tablist" aria-label="How do you want to start?" className="grid grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const on = tab.mode === mode;
          const Icon = tab.icon;
          return (
            <button
              key={tab.mode}
              ref={(button) => {
                tabRefs.current[tab.mode] = button;
              }}
              id={`tab-${tab.mode}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="help-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => switchMode(tab.mode)}
              onKeyDown={handleTabKey}
              className={`grid content-start gap-x-2.5 gap-y-0.5 rounded-box border-[1.5px] p-3 text-left transition-colors sm:grid-cols-[auto_1fr] sm:items-center ${
                on ? 'border-tea bg-turmeric-soft' : 'border-line bg-white hover:border-muted'
              }`}
            >
              <span
                className={`mb-1 grid size-9 place-items-center rounded-full sm:row-span-2 sm:mb-0 ${
                  on ? 'bg-turmeric' : 'bg-paper'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="leading-snug font-bold">{tab.title}</span>
              <span className="text-sm leading-snug text-muted">{tab.note}</span>
            </button>
          );
        })}
      </div>

      <form
        id="help-panel"
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-5 rounded-box border border-line bg-white p-4 sm:p-5"
      >
        {mode === 'describe' ? (
          <>
            <div className="grid gap-1.5">
              <label htmlFor={textId} className="font-semibold">
                What's wrong?
              </label>
              <textarea
                id={textId}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  clearField('text');
                }}
                maxLength={500}
                rows={5}
                placeholder="যেমন: রান্নাঘরের কলের নিচ দিয়ে পানি পড়ছে"
                aria-invalid={textError ? true : undefined}
                aria-describedby={`${textId}-note${textError ? ` ${textId}-error` : ''}`}
                className={`w-full resize-y rounded-box border-[1.5px] bg-white px-3.5 py-2.5 text-base text-tea placeholder:text-muted/70 focus:border-tea focus:outline-none ${
                  textError ? 'border-alert' : 'border-line'
                }`}
              />
              {textError && (
                <p id={`${textId}-error`} className="text-sm font-medium text-alert">
                  {textError}
                </p>
              )}
              <div id={`${textId}-note`} className="flex justify-between gap-3 text-sm text-muted">
                <span>Where it is and what you see helps.</span>
                <span>{text.length} / 500</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                Try one:
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setText(example);
                      clearField('text');
                    }}
                    className="rounded-box border-[1.5px] border-line bg-white px-2.5 py-1 text-sm text-tea hover:border-tea"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <PhotoPicker
              photos={photos}
              onChange={(next) => {
                setPhotos(next);
                clearField('text');
                clearField('photos');
              }}
              error={errors.fields.photos}
            />

            <p className="flex items-start gap-2 text-sm text-muted">
              <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              No need to write your phone number or address here. You'll add the address after
              choosing a karigor.
            </p>
          </>
        ) : services ? (
          <QuickFields
            services={services}
            serviceId={chosen?.id ?? ''}
            onServiceChange={(id) => {
              setServiceId(id);
              clearField('chosenServiceId');
            }}
            line={line}
            onLineChange={(value) => {
              setLine(value);
              clearField('text');
            }}
            errors={{ service: errors.fields.chosenServiceId, line: textError }}
          />
        ) : servicesError ? (
          <div className="grid gap-3">
            <Alert>{servicesError}</Alert>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setServicesError('');
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid place-items-center py-8 text-muted">
            <LoaderCircle className="animate-spin" aria-label="Loading services" />
          </div>
        )}

        {(mode === 'describe' || services) && (
          <Button type="submit" className="w-full text-[17px]">
            Find the right karigor
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        )}
      </form>

      <p className="flex items-start gap-2.5 rounded-box border border-line bg-white px-3.5 py-3 text-[15px]">
        <TriangleAlert size={20} className="mt-0.5 shrink-0 text-alert" aria-hidden="true" />
        <span>
          <b className="text-alert">Smell gas, see sparks or smoke?</b> Get everyone out first and
          call <b className="text-alert">999</b>. Then come back here.
        </span>
      </p>
    </div>
  );
}
