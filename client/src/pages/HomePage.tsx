import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Siren,
  Tags,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { homePathFor } from '../auth/types';
import { PhoneDemo } from '../components/home/PhoneDemo';
import { Logo } from '../components/Logo';
import { ServiceIcon } from '../components/ServiceIcon';
import { api } from '../lib/api';
import { taka } from '../lib/money';
import { useDocumentTitle } from '../lib/use-document-title';
import type { Area, Service } from './technician/profile-types';

// shown at once, and kept if the server can't be reached
const FALLBACK_SERVICES = [
  ['plumber', 'Plumber'],
  ['electrician', 'Electrician'],
  ['gas-fitter', 'Gas Fitter'],
  ['ac-repair', 'AC Repair'],
  ['painter', 'Painter'],
  ['carpenter', 'Carpenter'],
  ['cleaner', 'Cleaner'],
].map(([id, name]) => ({ id: id!, name: name!, nameBn: '', skills: [] }) as Service);

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Tell us the problem',
    text: '“AC theke pani porche” is enough. Write in Bangla, English or Banglish, and add a photo if you like.',
  },
  {
    icon: Tags,
    title: 'See the service and a fair price',
    text: 'Karigor tells you which karigor you need, how urgent it is and what it should cost, before anyone comes.',
  },
  {
    icon: CalendarCheck,
    title: 'Book one of the 3 best karigors',
    text: 'Close to you, free at your time, rated by your neighbours. Follow the job from your phone.',
  },
];

const PROMISES = [
  {
    icon: Banknote,
    title: 'Fair prices, shown first',
    text: 'Every price comes from our checked price list, not from guesswork. You see a range before you book.',
  },
  {
    icon: ShieldCheck,
    title: 'Checked karigors',
    text: 'Our admin checks every technician’s NID photo before they can get jobs. Ratings come only from real bookings.',
  },
  {
    icon: Siren,
    title: 'Safety first',
    text: 'Gas smell, sparks or smoke? Karigor shows safety steps and the 999 button first, then finds someone free right now.',
  },
  {
    icon: Wrench,
    title: 'Pay after the work',
    text: 'You pay the karigor in cash when the job is done. Your address is shared only after they accept.',
  },
];

const FAQ = [
  {
    q: 'Does it cost anything to use Karigor?',
    a: 'No. Describing the problem, seeing the price and booking are free. You pay only the karigor, in cash, after the work.',
  },
  {
    q: 'How does Karigor know what is wrong?',
    a: 'A smart check reads what you wrote (and your photo) and picks the service and the jobs from our price list. If it is not sure, it asks you one short question. You can always change the service yourself.',
  },
  {
    q: 'Is the price final?',
    a: 'It is a fair range from our price list. Parts are extra. The karigor confirms the final price after checking, before starting the work.',
  },
  {
    q: 'Who sees my phone number and address?',
    a: 'Only the karigor you booked, and only after they accept. Phone numbers are shared while the job is going on.',
  },
  {
    q: 'What if the karigor says no?',
    a: 'You are told right away and can book another of the top 3 for the same problem in one tap.',
  },
];

const sectionTitle = 'font-heading text-3xl font-extrabold leading-tight sm:text-4xl';
const buttonBase =
  'inline-flex h-12 items-center justify-center gap-2 rounded-box px-6 text-base font-bold';

export default function HomePage() {
  useDocumentTitle('Find the right home technician in Dhaka');
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>(FALLBACK_SERVICES);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    let stillHere = true;
    api<{ services: Service[] }>('/services')
      .then((data) => stillHere && data.services.length > 0 && setServices(data.services))
      .catch(() => undefined);
    api<{ areas: Area[] }>('/areas')
      .then((data) => stillHere && setAreas(data.areas))
      .catch(() => undefined);
    return () => {
      stillHere = false;
    };
  }, []);

  const startPath = user ? homePathFor(user.role) : '/register';

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Logo />
          <nav aria-label="Home sections" className="hidden flex-1 lg:block">
            <ul className="flex gap-1">
              {[
                ['#how', 'How it works'],
                ['#services', 'Services'],
                ['#technicians', 'For technicians'],
                ['#faq', 'Questions'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="inline-flex h-10 items-center rounded-box px-3 font-semibold text-muted no-underline hover:text-tea"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                to={homePathFor(user.role)}
                className={`${buttonBase} h-10 bg-turmeric px-4 text-tea hover:bg-turmeric-dark`}
              >
                Go to my page
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`${buttonBase} h-10 border-[1.5px] border-tea bg-white px-4 text-tea hover:bg-paper`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className={`${buttonBase} hidden h-10 bg-turmeric px-4 text-tea hover:bg-turmeric-dark sm:inline-flex`}
                >
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="bg-gradient-to-b from-white to-paper">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid gap-5">
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Something broken at home? Tell us. We'll find the right karigor.
              </h1>
              <p className="text-lg text-muted">
                Write the problem in Bangla or English, or add a photo. Karigor tells you who to
                call, what it should cost, and shows trusted technicians near you in Dhaka.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={user ? homePathFor(user.role) : '/register'}
                  className={`${buttonBase} bg-turmeric text-tea hover:bg-turmeric-dark`}
                >
                  Get help now
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
                <a
                  href="#how"
                  className={`${buttonBase} border-[1.5px] border-tea bg-white text-tea no-underline hover:bg-paper`}
                >
                  See how it works
                </a>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-pond" aria-hidden="true" />
                  NID-checked technicians
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Banknote size={16} className="text-pond" aria-hidden="true" />
                  Price before the visit
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <MapPin size={16} className="text-pond" aria-hidden="true" />
                  {areas.length > 0 ? `${areas.length} areas of Dhaka` : 'All over Dhaka'}
                </li>
              </ul>
            </div>
            <PhoneDemo />
          </div>
        </section>

        {/* emergency strip */}
        <div className="mx-auto max-w-6xl px-4">
          <p className="flex items-start gap-2.5 rounded-box bg-alert-soft px-4 py-3 text-alert-ink">
            <Siren size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <b>Smell gas, see sparks or smoke?</b> Leave the room and call <b>999</b> first. Free
              from any phone: police, fire service and ambulance.
            </span>
          </p>
        </div>

        {/* how it works */}
        <section id="how" className="mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-4 py-14">
          <h2 className={sectionTitle}>How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-3 rounded-box border border-line bg-white p-5"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-tea font-heading text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <step.icon size={22} className="text-pond" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* services */}
        <section id="services" className="scroll-mt-20 bg-white py-14">
          <div className="mx-auto grid max-w-6xl gap-6 px-4">
            <div className="grid gap-2">
              <h2 className={sectionTitle}>7 services, one place</h2>
              <p className="text-muted">Starting prices from our price list. Parts are extra.</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="grid justify-items-center gap-2 rounded-box border border-line bg-paper px-2 py-4 text-center"
                >
                  <span className="grid size-12 place-items-center rounded-full bg-turmeric-soft">
                    <ServiceIcon serviceId={service.id} size={22} />
                  </span>
                  <b className="leading-tight">{service.name}</b>
                  {service.nameBn && <span className="text-sm text-muted">{service.nameBn}</span>}
                  {typeof service.startingPrice === 'number' && (
                    <span className="text-sm font-semibold text-pond">
                      from {taka(service.startingPrice)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* fair prices, trust and safety */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14">
          <h2 className={sectionTitle}>Why people in Dhaka use Karigor</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((item) => (
              <li
                key={item.title}
                className="grid content-start gap-2.5 rounded-box border border-line bg-white p-5"
              >
                <item.icon size={26} className="text-pond" aria-hidden="true" />
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* technicians */}
        <section id="technicians" className="scroll-mt-20 px-4 pb-14">
          <div className="mx-auto grid max-w-6xl gap-6 rounded-box border border-[#bfdcd3] bg-pond-soft p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="grid gap-3">
              <BriefcaseBusiness size={30} className="text-pond" aria-hidden="true" />
              <h2 className={sectionTitle}>Are you a technician?</h2>
              <p className="text-lg">
                Get jobs near your area, with the problem and a fair price explained before you go.
                Free to join.
              </p>
            </div>
            <div className="grid gap-4">
              <ul className="grid gap-2">
                {[
                  'Choose your services, area, days and hours',
                  'Accept or say no to each request',
                  'Turn "Taking jobs" off any time',
                  'Get paid in cash by the customer',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 font-semibold">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-pond"
                      aria-hidden="true"
                    />
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                to={user ? homePathFor(user.role) : '/register'}
                className={`${buttonBase} justify-self-start border-[1.5px] border-tea bg-white text-tea hover:bg-paper`}
              >
                Join as a karigor
              </Link>
            </div>
          </div>
        </section>

        {/* areas */}
        {areas.length > 0 && (
          <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-14">
            <h2 className={sectionTitle}>Areas we cover</h2>
            <ul className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <li
                  key={area.name}
                  className="inline-flex items-center gap-1 rounded-box border border-line bg-white px-3 py-1.5 text-sm font-semibold"
                >
                  <MapPin size={14} className="text-muted" aria-hidden="true" />
                  {area.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* faq */}
        <section id="faq" className="mx-auto grid max-w-3xl scroll-mt-20 gap-5 px-4 pb-16">
          <h2 className={sectionTitle}>Questions</h2>
          <div className="grid gap-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-box border border-line bg-white px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {item.q}
                  <ChevronRight
                    size={18}
                    className="shrink-0 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-2 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
          <Link
            to={startPath}
            className={`${buttonBase} justify-self-start bg-turmeric text-tea hover:bg-turmeric-dark`}
          >
            Try Karigor now
          </Link>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>
            <b className="text-tea">Karigor</b> · কারিগর · Trusted home technicians in Dhaka
          </span>
          <span>Emergency: 999 · Pay in cash after the work</span>
        </div>
      </footer>
    </div>
  );
}
