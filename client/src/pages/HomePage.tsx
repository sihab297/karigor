import { Link } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { homePathFor } from '../auth/types';
import { Logo } from '../components/Logo';

const services = [
  'Plumber',
  'Electrician',
  'Gas fitter',
  'AC repair',
  'Painter',
  'Carpenter',
  'Cleaner',
];

export default function HomePage() {
  const { user } = useAuth();
  const button =
    'inline-flex h-12 items-center justify-center rounded-box px-6 text-base font-bold';

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-14">
      <div className="mx-auto grid max-w-2xl gap-8">
        <Logo />
        <div className="grid gap-4">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Something broken at home? Tell us. We'll find the right karigor.
          </h1>
          <p className="text-lg text-muted">
            Write the problem in Bangla or English, or add a photo. Karigor tells you who to call,
            what it should cost, and shows trusted technicians near you in Dhaka.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Services">
          {services.map((service) => (
            <li
              key={service}
              className="rounded-box bg-turmeric-soft px-3 py-1 text-sm font-semibold"
            >
              {service}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link
              to={homePathFor(user.role)}
              className={`${button} bg-turmeric text-tea hover:bg-turmeric-dark`}
            >
              Go to my page
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className={`${button} bg-turmeric text-tea hover:bg-turmeric-dark`}
              >
                Create an account
              </Link>
              <Link
                to="/login"
                className={`${button} border-[1.5px] border-tea bg-white text-tea hover:bg-paper`}
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
