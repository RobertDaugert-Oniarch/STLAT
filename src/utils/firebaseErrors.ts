import type { Translations } from "../translations";

interface ErrorOptions {
  /** Use login-specific messages (e.g., "Incorrect email or password" instead of "Current password is incorrect") */
  loginContext?: boolean;
}

/**
 * Maps a Firebase error code to a user-facing translated message.
 * Consolidates error handling logic duplicated across pages.
 */
export function getFirebaseErrorMessage(code: string, t: Translations, options?: ErrorOptions): string {
  switch (code) {
    case "auth/wrong-password":
      return options?.loginContext ? t.errorInvalidCredentials : t.wrongPassword;
    case "auth/invalid-credential":
      return options?.loginContext ? t.errorInvalidCredentials : t.wrongPassword;
    case "auth/requires-recent-login":
      return t.errorRequiresRecentLogin;
    case "auth/email-already-in-use":
      return t.errorEmailInUse;
    case "auth/invalid-email":
      return t.errorInvalidEmail;
    case "auth/too-many-requests":
      return t.errorTooManyRequests;
    case "auth/network-request-failed":
      return t.errorNetworkFailed;
    case "auth/user-not-found":
      return t.errorUserNotFound;
    case "auth/user-disabled":
      return t.errorUserDisabled;
    default:
      return t.unexpectedError;
  }
}

/** Extracts the Firebase error code from an unknown catch value. */
export function getFirebaseErrorCode(err: unknown): string {
  return (err as { code?: string }).code ?? "";
}
