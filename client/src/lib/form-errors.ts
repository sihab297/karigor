import { ApiError } from './api';

export interface FormErrors {
  fields: Record<string, string>;
  message: string;
}

export function formErrorsFrom(error: unknown): FormErrors {
  if (error instanceof ApiError) {
    if (error.fieldErrors.length > 0) {
      return {
        fields: Object.fromEntries(error.fieldErrors.map((e) => [e.field, e.message])),
        message: '',
      };
    }
    return { fields: {}, message: error.message };
  }
  return { fields: {}, message: 'Something went wrong. Please try again.' };
}

export const noErrors: FormErrors = { fields: {}, message: '' };
