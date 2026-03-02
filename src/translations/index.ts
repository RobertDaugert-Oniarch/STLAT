// All UI strings for every supported language.
// Add new keys here, then use them via the `t` object from useLang().

export type Language = "en" | "lv";

export const translations = {
  en: {
    // Login page
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signInSubtitle: "Sign in to your account",
    signUpSubtitle: "Sign up to get started",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Min. 6 characters",
    signIn: "Sign In",
    signUp: "Sign Up",
    loading: "Loading...",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    unexpectedError: "An unexpected error occurred.",
    // Theme toggle
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    // Language toggle
    switchToLv: "Switch to Latvian",
    switchToEn: "Switch to English",
  },
  lv: {
    // Login page
    welcomeBack: "Laipni l\u016Bdzam atpaka\u013C",
    createAccount: "Izveidot kontu",
    signInSubtitle: "Piesakieties sav\u0101 kont\u0101",
    signUpSubtitle: "Re\u0123istr\u0113jieties, lai s\u0101ktu",
    email: "E-pasts",
    emailPlaceholder: "j\u016Bs@piem\u0113rs.lv",
    password: "Parole",
    passwordPlaceholder: "Min. 6 simboli",
    signIn: "Pieteikties",
    signUp: "Re\u0123istr\u0113ties",
    loading: "Iel\u0101d\u0113...",
    alreadyHaveAccount: "Jau ir konts?",
    dontHaveAccount: "Nav konta?",
    unexpectedError: "Negaid\u012Bta k\u013C\u016Bda.",
    // Theme toggle
    switchToLight: "P\u0101rsl\u0113gt uz gai\u0161o re\u017E\u012Bmu",
    switchToDark: "P\u0101rsl\u0113gt uz tum\u0161o re\u017E\u012Bmu",
    // Language toggle
    switchToLv: "P\u0101rsl\u0113gt uz latvie\u0161u valodu",
    switchToEn: "P\u0101rsl\u0113gt uz ang\u013Cu valodu",
  },
} as const;

// Derive the type from the object so keys always stay in sync
export type Translations = (typeof translations)[Language];
