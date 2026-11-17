import { useState } from 'react';
import { api } from '../../../lib/api';
import { formErrorsFrom, noErrors, type FormErrors } from '../../../lib/form-errors';

type Method = 'POST' | 'PATCH' | 'DELETE';

// one save at a time, with its errors, then reload the catalog from the server
export function useAdminSave(onSaved: () => Promise<void> | void) {
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>(noErrors);

  async function save(key: string, method: Method, path: string, body?: object) {
    setSaving(key);
    setErrors(noErrors);
    try {
      await api(path, { method, body });
      await onSaved();
      return true;
    } catch (error) {
      setErrors(formErrorsFrom(error));
      return false;
    } finally {
      setSaving(null);
    }
  }

  return { save, saving, errors, setErrors };
}
