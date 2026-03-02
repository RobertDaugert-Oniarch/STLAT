export interface PasswordCheck {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
}

export function validatePassword(password: string): PasswordCheck {
  return {
    minLength: password.length >= 12,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
  };
}

export function isPasswordValid(check: PasswordCheck): boolean {
  return Object.values(check).every(Boolean);
}
