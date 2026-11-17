export const required = (value) => (value ? '' : 'This field is required');

export const email = (value) => {
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Invalid email address';
};

export const phone = (value) => {
  if (!value) return '';
  return /^[0-9]{10}$/.test(value) ? '' : 'Enter a valid 10-digit phone number';
};

export const minLength = (min) => (value) => {
  if (!value) return '';
  return value.length >= min ? '' : `Minimum ${min} characters required`;
};

export const maxLength = (max) => (value) => {
  if (!value) return '';
  return value.length <= max ? '' : `Maximum ${max} characters allowed`;
};

export const positiveNumber = (value) => {
  if (!value && value !== 0) return '';
  return Number(value) > 0 ? '' : 'Must be a positive number';
};

export const validate = (value, rules = []) => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return '';
};
