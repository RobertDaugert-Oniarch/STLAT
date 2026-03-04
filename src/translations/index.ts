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
    emailOrUsername: "Email or Username",
    emailOrUsernamePlaceholder: "you@example.com or SilentFox#1234",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Min. 12 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Repeat your password",
    passwordsDoNotMatch: "Passwords do not match.",
    signIn: "Sign In",
    signUp: "Sign Up",
    loading: "Loading...",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    unexpectedError: "An unexpected error occurred.",
    // Password requirements
    pwdMinLength: "At least 12 characters",
    pwdLowercase: "One lowercase letter",
    pwdUppercase: "One uppercase letter",
    pwdDigit: "One digit",
    pwdSymbol: "One special character",
    // Username generation
    yourUsername: "Your username",
    yourUsernameSub: "Remember it — this is how others will see you!",
    continueBtn: "Continue",
    // Profile page -- greetings
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    greetingNight: "Night owl?",
    // Profile page -- levels
    level_beginner: "Beginner",
    level_intermediate: "Intermediate",
    level_advanced: "Advanced",
    level_expert: "Expert",
    // Profile page -- test result
    lastTestResult: "Test Result",
    score: "Score",
    noTestResult: "No test results yet",
    // Profile page -- learning blocks
    learningProgress: "Learning Progress",
    moduleGrammar: "Grammar",
    moduleVocabulary: "Vocabulary",
    moduleReading: "Reading",
    moduleListening: "Listening",
    completed: "completed",
    // Settings menu
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    signOut: "Sign Out",
    // Sidebar navigation
    navHome: "Home",
    navSurvey: "Survey",
    navLectures: "Lectures",
    // Theme toggle
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    // Language toggle
    switchToLv: "Switch to Latvian",
    switchToEn: "Switch to English",
    // Settings page
    settingsPageTitle: "User Settings",
    account: "Account",
    username: "Username",
    delete: "Delete",
    resetSent: "Reset email sent",
    confirmDeleteAccount: "Delete Account",
    confirmDeleteDesc: "Are you sure you want to delete your account? This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    backToProfile: "Back",
  },
  lv: {
    // Login page
    welcomeBack: "Laipni l\u016Bdzam atpaka\u013C",
    createAccount: "Izveidot kontu",
    signInSubtitle: "Piesakieties sav\u0101 kont\u0101",
    signUpSubtitle: "Re\u0123istr\u0113jieties, lai s\u0101ktu",
    emailOrUsername: "E-pasts vai lietot\u0101jv\u0101rds",
    emailOrUsernamePlaceholder: "j\u016Bs@piem\u0113rs.lv vai SilentFox#1234",
    email: "E-pasts",
    emailPlaceholder: "j\u016Bs@piem\u0113rs.lv",
    password: "Parole",
    passwordPlaceholder: "Min. 12 simboli",
    confirmPassword: "Apstiprin\u0101t paroli",
    confirmPasswordPlaceholder: "Atk\u0101rtojiet paroli",
    passwordsDoNotMatch: "Paroles nesakr\u012Bt.",
    signIn: "Pieteikties",
    signUp: "Re\u0123istr\u0113ties",
    loading: "Iel\u0101d\u0113...",
    alreadyHaveAccount: "Jau ir konts?",
    dontHaveAccount: "Nav konta?",
    unexpectedError: "Negaid\u012Bta k\u013C\u016Bda.",
    // Password requirements
    pwdMinLength: "Vismaz 12 simboli",
    pwdLowercase: "Viens mazais burts",
    pwdUppercase: "Viens lielais burts",
    pwdDigit: "Viens cipars",
    pwdSymbol: "Viens \u012Bpa\u0161ais simbols",
    // Username generation
    yourUsername: "Tavs lietot\u0101jv\u0101rds",
    yourUsernameSub: "Iegaum\u0113 to \u2014 citi tevi redz\u0113s ar \u0161o v\u0101rdu!",
    continueBtn: "Turpin\u0101t",
    // Profile page -- greetings
    greetingMorning: "Labr\u012Bt",
    greetingAfternoon: "Labdien",
    greetingEvening: "Labvakar",
    greetingNight: "Nakts p\u016Bce?",
    // Profile page -- levels
    level_beginner: "Ies\u0101c\u0113js",
    level_intermediate: "Vid\u0113jais",
    level_advanced: "Augst\u0101kais",
    level_expert: "Eksperts",
    // Profile page -- test result
    lastTestResult: "Testa rezult\u0101ts",
    score: "Rezult\u0101ts",
    noTestResult: "Nav testa rezult\u0101tu",
    // Profile page -- learning blocks
    learningProgress: "M\u0101c\u012Bbu progress",
    moduleGrammar: "Gramatika",
    moduleVocabulary: "V\u0101rdu kr\u0101jums",
    moduleReading: "Las\u012B\u0161ana",
    moduleListening: "Klaus\u012B\u0161an\u0101s",
    completed: "pabeigts",
    // Settings menu
    settings: "Iestat\u012Bjumi",
    theme: "T\u0113ma",
    language: "Valoda",
    signOut: "Izrakst\u012Bties",
    // Sidebar navigation
    navHome: "S\u0101kums",
    navSurvey: "Aptauja",
    navLectures: "Lekcijas",
    // Theme toggle
    switchToLight: "P\u0101rsl\u0113gt uz gai\u0161o re\u017E\u012Bmu",
    switchToDark: "P\u0101rsl\u0113gt uz tum\u0161o re\u017E\u012Bmu",
    // Language toggle
    switchToLv: "P\u0101rsl\u0113gt uz latvie\u0161u valodu",
    switchToEn: "P\u0101rsl\u0113gt uz ang\u013Cu valodu",
    // Settings page
    settingsPageTitle: "Lietot\u0101ja iestat\u012Bjumi",
    account: "Konts",
    username: "Lietot\u0101jv\u0101rds",
    delete: "Dz\u0113st",
    resetSent: "Atiestat\u012B\u0161anas e-pasts nos\u016Bts",
    confirmDeleteAccount: "Dz\u0113st kontu",
    confirmDeleteDesc: "Vai tie\u0161\u0101m v\u0113laties dz\u0113st savu kontu? \u0160o darb\u012Bbu nevar atcelt.",
    cancel: "Atcelt",
    confirm: "Apstiprin\u0101t",
    backToProfile: "Atpaka\u013C",
  },
} as const;

// Derive the type from the object so keys always stay in sync
export type Translations = (typeof translations)[Language];
