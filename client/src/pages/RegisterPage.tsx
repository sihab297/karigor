import { Hammer, House } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { homePathFor, type RegisterInput } from '../auth/types';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { PasswordField } from '../components/PasswordField';
import { TextField } from '../components/TextField';
import { formErrorsFrom, noErrors, type FormErrors } from '../lib/form-errors';
import { useDocumentTitle } from '../lib/use-document-title';

const roles = [
  {
    value: 'customer',
    title: 'I need a karigor',
    bangla: 'আমার কারিগর দরকার',
    detail: 'Get repairs and cleaning done at home',
    Icon: House,
  },
  {
    value: 'technician',
    title: 'I am a karigor',
    bangla: 'আমি কারিগর',
    detail: 'Find work near you',
    Icon: Hammer,
  },
] as const;

export default function RegisterPage() {
  useDocumentTitle('Create your account');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'customer',
  });
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [sending, setSending] = useState(false);

  if (user && !sending) return <Navigate to={homePathFor(user.role)} replace />;

  const update = (field: keyof RegisterInput) => (e: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: e.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors(noErrors);
    setSending(true);
    try {
      const created = await register(form);
      navigate(homePathFor(created.role), { replace: true });
    } catch (error) {
      setErrors(formErrorsFrom(error));
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-pond underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        {errors.message && <Alert>{errors.message}</Alert>}

        <fieldset className="grid gap-2.5">
          <legend className="mb-1.5 text-sm font-semibold">Who are you?</legend>
          {roles.map(({ value, title, bangla, detail, Icon }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-box border-[1.5px] p-3.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-pond ${
                form.role === value
                  ? 'border-tea bg-turmeric-soft'
                  : 'border-line bg-white hover:border-muted'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={form.role === value}
                onChange={update('role')}
                className="sr-only"
              />
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full ${
                  form.role === value ? 'bg-turmeric' : 'bg-paper'
                }`}
              >
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="grid">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted">
                  {detail} · {bangla}
                </span>
              </span>
            </label>
          ))}
          {errors.fields.role && (
            <p className="text-sm font-medium text-alert">{errors.fields.role}</p>
          )}
        </fieldset>

        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
          error={errors.fields.name}
        />
        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01712345678"
          hint="You'll use this to log in."
          value={form.phone}
          onChange={update('phone')}
          error={errors.fields.phone}
        />
        <TextField
          label="Email (optional)"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.fields.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={form.password}
          onChange={update('password')}
          error={errors.fields.password}
        />
        <Button type="submit" loading={sending}>
          {sending ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
