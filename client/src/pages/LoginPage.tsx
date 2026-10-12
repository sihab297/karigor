import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { homePathFor } from '../auth/types';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { PasswordField } from '../components/PasswordField';
import { TextField } from '../components/TextField';
import { formErrorsFrom, noErrors, type FormErrors } from '../lib/form-errors';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [sending, setSending] = useState(false);

  if (user && !sending) return <Navigate to={homePathFor(user.role)} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const missing: Record<string, string> = {};
    if (!phoneOrEmail.trim()) missing.phoneOrEmail = 'Enter your phone number or email';
    if (!password) missing.password = 'Enter your password';
    if (Object.keys(missing).length > 0) {
      setErrors({ fields: missing, message: '' });
      return;
    }

    setErrors(noErrors);
    setSending(true);
    try {
      const loggedIn = await login(phoneOrEmail, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? homePathFor(loggedIn.role), { replace: true });
    } catch (error) {
      setErrors(formErrorsFrom(error));
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Use your phone number or email."
      footer={
        <>
          New to Karigor?{' '}
          <Link to="/register" className="font-semibold text-pond underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        {errors.message && <Alert>{errors.message}</Alert>}
        <TextField
          label="Phone or email"
          name="phoneOrEmail"
          autoComplete="username"
          placeholder="01712345678"
          value={phoneOrEmail}
          onChange={(e) => setPhoneOrEmail(e.target.value)}
          error={errors.fields.phoneOrEmail}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.fields.password}
        />
        <Button type="submit" loading={sending}>
          {sending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
