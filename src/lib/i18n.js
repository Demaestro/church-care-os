import {
  displayModeOptions,
  getLocaleTag,
  languageOptions,
  normalizeLanguage,
} from "@/lib/app-preferences";

const englishDictionary = {
  layout: {
    brandKicker: "Church Care",
    brandTitle: "Operations board",
    signIn: "Sign in",
    signOut: "Sign out",
    preferencesTitle: "Language and text size",
    preferencesBody:
      "Choose the language you prefer and make the text easier to read.",
    languageLabel: "Language",
    textSizeLabel: "Text size",
    applyPreferences: "Apply",
    roleLabels: {
      owner: "Owner",
      pastor: "Pastor",
      leader: "Leader",
      volunteer: "Volunteer",
    },
    nav: {
      dashboard: "Dashboard",
      requestCare: "Request care",
      trackRequest: "Track request",
      permissions: "Permissions",
      signIn: "Sign in",
      teams: "Teams",
      people: "People",
      reports: "Reports",
      leaderView: "Leader view",
      households: "Households",
      volunteerView: "Volunteer view",
      notifications: "Notifications",
      audit: "Audit",
      settings: "Settings",
    },
    footerPrimary:
      "Built for care teams who want clarity, warmth, and fewer dropped handoffs.",
    footerSecondary:
      "Pastors, deacons, and volunteers stay in one visible rhythm.",
  },
  displayModes: {
    standard: "Standard",
    comfort: "Comfort / larger text",
  },
  home: {
    greeting: (name) => `Good morning, ${name}`,
    newCareRequest: "+ New care request",
    metrics: {
      openCases: "Open cases",
      overdueFollowUps: "Overdue follow-ups",
      atRiskMembers: "At risk members",
      resolvedThisMonth: "Resolved this month",
    },
    panels: {
      activeCareCases: "Active care cases",
      overdueFollowUps: "Overdue follow-ups",
      atRiskHeading: "Members at risk of being overlooked",
      seeAll: "See all",
      howCalculated: "How is this calculated?",
      reachOut: "Reach out",
    },
    dates: {
      noDate: "No date",
      dueToday: "Due today",
      dueTomorrow: "Due tomorrow",
      dueInDays: (days) => `Due in ${days} days`,
      overdueDays: (days) => `${days} day${days === 1 ? "" : "s"} overdue`,
    },
  },
  requestNew: {
    kicker: "Member intake",
    title: "Ask for care without navigating church structure first.",
    description:
      "A pastor or care lead reviews every request before anything is routed wider. Privacy choices live inside this form so members can decide consent at the point of submission.",
    trackRequest: "Track a request",
    permissions: "View permission matrix",
    emergencyFallback:
      "If the situation is unsafe or urgent right now, contact a pastor or emergency support directly instead of waiting on this form alone.",
  },
  intakeForm: {
    steps: {
      support: "Step 1 · support",
      contact: "Step 2 · contact",
      privacy: "Step 3 · privacy",
    },
    title: "Request care or support",
    intro:
      "This is a private space. Share what you are comfortable sharing. Your pastor and care team are here to help, not judge.",
    supportQuestion: "What kind of support do you need?",
    needError: "Choose the kind of support that would help most right now.",
    summaryLabel: "Tell us a bit more (optional)",
    summaryPlaceholder:
      "Share as much or as little as you are comfortable with. You can always add more later.",
    urgencyLabel: "How urgent is this?",
    nameLabel: "Your name (optional)",
    namePlaceholder: "Leave blank if you want a pastor to review first",
    emailLabel: "Email for updates (optional, only if contact is allowed)",
    emailPlaceholder: "you@example.com",
    contactLabel: "Best contact method (optional)",
    contactPlaceholder: "Phone number, email, or what works best",
    privacyIntro:
      "You control who sees this request. These choices apply to this submission only.",
    keepPrivateTitle: "Keep my name private",
    keepPrivateDetail: "Only your pastor will know this came from you.",
    sensitiveTitle: "Mark as sensitive",
    sensitiveDetail:
      "Visible only to pastor until they decide what should be shared more widely.",
    allowContactTitle: "I consent to being contacted",
    allowContactDetail:
      "Allow the care team to reach out by phone, text, or visit when follow-up is needed.",
    submit: "Submit care request",
    submitting: "Submitting care request...",
    footerHelp:
      "Only the people you consent to share with will see this request inside the app.",
    rateLimited:
      "Please wait a little before sending another request from this connection.",
    successKicker: "Request received",
    successTitle: "Your care request has been sent.",
    trackingCodeLabel: "Tracking code",
    trackingCodeHelp:
      "Use this code any time you want to check the status of this request without signing in.",
    trackThisRequest: "Track this request",
    submitAnother: "Submit another request",
    optionLabels: {
      Prayer: "Prayer",
      Counseling: "Counseling",
      "Hospital visit": "Hospital visit",
      "Financial help": "Financial help",
      "Meal support": "Meal support",
      Transport: "Transport",
      "Someone to talk to": "Someone to talk to",
      "Grief support": "Grief support",
      Other: "Other",
    },
    urgencyOptions: {
      "no-rush": "This can wait - whenever someone is available",
      "this-week": "This week would help",
      "48-hours": "Within 48 hours would help",
      today: "Today - this feels urgent",
    },
  },
  requestStatusPage: {
    kicker: "Member self-service",
    title: "Check where your care request stands.",
    description:
      "Use the tracking code from your intake confirmation to see a calm, member-safe progress view without logging in or exposing internal care notes.",
    infoVisibleTitle: "What appears here",
    infoVisibleBody:
      "You will see the request stage, the current follow-up status, and a privacy-safe timeline of major care handoffs.",
    infoSupportTitle: "Need help with the code?",
    infoSupportBody: (email, phone) =>
      `If you cannot find your code, contact ${email || "your church care team"}${
        phone ? ` or call ${phone}` : ""
      }.`,
    submitCareRequest: "Submit a care request",
    accountRecovery: "Account recovery",
  },
  requestStatusLookup: {
    trackingCodeLabel: "Tracking code",
    helper:
      "Enter the code from your intake confirmation to see the current care status and a member-safe timeline.",
    checkStatus: "Check status",
    checkingStatus: "Looking up request...",
    foundMessage: "We found your request.",
    requestLocated: "Request located",
    infoCards: {
      supportNeed: "Support need",
      created: "Created",
      responseWindow: "Response window",
      privacy: "Privacy",
    },
    currentUpdate: "Current update",
    timelineTitle: "Member-safe timeline",
    submitAnotherRequest: "Submit another request",
    helperCards: {
      visibleTitle: "What you can see here",
      visibleBody:
        "This page shows a member-safe view of the request status, follow-up stage, and privacy boundary without exposing internal notes.",
      noCodeTitle: "No code yet?",
      noCodeBody:
        "If you just submitted a request, use the tracking code shown on the confirmation screen. If you no longer have it, contact your church care team directly.",
    },
    actionMessages: {
      enterCode: "Enter the tracking code from your request confirmation.",
      trackingRequired: "Tracking code is required.",
      notFound:
        "We could not find a care request with that code yet. Check the code and try again.",
      notFoundField: "No request matched that code.",
    },
  },
  loginPage: {
    kicker: "Internal access",
    title: "Sign in before you open internal care workflows.",
    description:
      "Pastor, leader, owner, and volunteer screens are protected with role-based access checks on both pages and server actions.",
    publicRouteTitle: "Public route",
    publicRouteBody:
      "Members can still submit a care request without signing in at /requests/new.",
    welcomeBack: "Welcome back",
    useAssignedAccount: "Use the account assigned to your care role.",
    needRecovery: "Need account recovery?",
    trackRequest: "Track a care request",
    demoAccounts: "Local demo accounts",
  },
  loginForm: {
    emailLabel: "Email",
    passwordLabel: "Password",
    emailPlaceholder: "pastor@grace.demo",
    passwordPlaceholder: "Enter your password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    actionMessages: {
      emailRequired: "Enter the email tied to your care team account.",
      passwordRequired: "Enter your password.",
      fixFields: "Please correct the highlighted fields and try again.",
      invalidCredentials: "We could not sign you in with those credentials.",
      retryHint: "Check your email and password, then try again.",
    },
  },
  recoveryPage: {
    kicker: "Protected sign-in support",
    title: "Request account recovery.",
    description:
      "Internal accounts are recovered manually so pastors and care admins can verify requests carefully before any password is changed.",
    nextTitle: "What happens next",
    nextBody:
      "A pastor or owner reviews the request inside the admin workspace, verifies the account, and issues a new password safely.",
    supportTitle: "Need direct support?",
    supportBody: (email, phone) =>
      `${email || "Contact your church care team"}${phone ? ` or call ${phone}` : ""}.`,
    backToSignIn: "Back to sign in",
    trackInstead: "Track a request instead",
    tellUsTitle: "Tell us which account needs help",
    tellUsBody:
      "We do not expose whether an account exists on this screen. Every request is reviewed the same way.",
  },
  recoveryForm: {
    successKicker: "Recovery request logged",
    successTitle: "A care admin will review this manually.",
    nameLabel: "Your name (optional)",
    namePlaceholder: "Name of the person requesting help",
    emailLabel: "Account email",
    emailPlaceholder: "you@example.com",
    noteLabel: "What would help us verify this request? (optional)",
    notePlaceholder:
      "For example: your ministry role, last login, or safest way to reach you",
    submit: "Request account recovery",
    submitting: "Sending request...",
    actionMessages: {
      emailRequired: "Enter the email address connected to your care account.",
      emailInvalid: "Enter a valid email address.",
      fixFields: "Please correct the highlighted fields and try again.",
      rateLimited:
        "We have received several recovery requests from this connection in a short window. Please wait a bit and try again.",
      logged:
        "We have logged your request. A pastor or care admin will review it and follow up safely.",
    },
  },
  volunteer: {
    hero:
      "Volunteer tasks only show the context needed to act safely and kindly.",
    title: "Your care tasks",
    assigned: "Assigned",
    completed: "Completed",
    sections: {
      overdue: "Overdue",
      dueToday: "Due today",
      upcoming: "Upcoming",
      completed: "Completed",
    },
    emptyAssignedTitle: "No assigned tasks right now",
    emptyAssignedBody:
      "When a leader routes work to this volunteer, it will appear here automatically.",
    emptyCompletedTitle: "No completed tasks yet",
    emptyCompletedBody:
      "Completed volunteer handoffs will collect here once requests are closed.",
    accepted: (label) =>
      `Accepted ${label !== "No time set" ? label : "recently"}.`,
    acceptTask: "Accept task",
    accepting: "Accepting...",
    markComplete: "Mark complete",
    completing: "Completing...",
    addNote: "Add note",
    hideNote: "Hide note",
    declineTask: "Decline task",
    keepTask: "Keep task",
    noteLabel: "Note for the care timeline",
    notePlaceholder:
      "What happened, and what should the leader or pastor know next?",
    saveNote: "Save note",
    savingNote: "Saving note...",
    declineReason: "Reason for re-routing",
    declinePlaceholder:
      "Share what changed so the leader can reassign this safely.",
    reroute: "Send back for re-routing",
    rerouting: "Sending back...",
  },
};

const translatedDictionaries = {
  ig: {
    layout: {
      brandTitle: "Ogige oru",
      signIn: "Banye",
      signOut: "Puo",
      preferencesTitle: "Asusu na nha ederede",
      preferencesBody:
        "Horo asusu i choro ma mee ka ederede di mfe igu.",
      languageLabel: "Asusu",
      textSizeLabel: "Nha ederede",
      applyPreferences: "Tinye",
      nav: {
        dashboard: "Nlele isi",
        requestCare: "Ria nlekota",
        trackRequest: "Soro aririo",
        permissions: "Ikike",
        signIn: "Banye",
        teams: "Otu",
        people: "Ndi mmadu",
        reports: "Akuko",
        leaderView: "Nlele onye ndu",
        households: "Ezinaulo",
        volunteerView: "Nlele onye enyemaka",
        notifications: "Ozi",
        audit: "Nyocha",
        settings: "Ntọala",
      },
      footerPrimary:
        "E wuru ya maka ndi otu nlekota choro ido anya, obi oma, na handoff na-adaghi ada.",
      footerSecondary:
        "Ndi ukochukwu, ndi dikaon, na ndi enyemaka na-ano n'otu rhythm a na-ahu anya.",
    },
    displayModes: {
      standard: "Nke nkịtị",
      comfort: "Nke di mfe / mkpụrụ okwu buru ibu",
    },
    requestNew: {
      kicker: "Nnata ndi otu",
      title: "Ria nlekota n’enweghi ibu uzo ulo uka mara tupu oge eruo.",
      description:
        "Onye ukochukwu ma obu onye ndu nlekota na-enyocha aririo obula tupu ekenye ya n’uzo sara mbara. Nhọrọ nzuzo di n’ime form a ka onye otu wee kpebie nkwenye ozugbo.",
      trackRequest: "Soro aririo",
      permissions: "Lee matriks ikike",
    },
    requestStatusPage: {
      kicker: "Onye otu n’onwe ya",
      title: "Lelee ebe aririo nlekota gi ruru.",
      description:
        "Jiri koodu nsonye i nwetara ka i wee hu nlele zuru udo ma nwekwa nchekwa n’enweghi login.",
      submitCareRequest: "Zipu aririo nlekota",
      accountRecovery: "Nwegharia akaụntụ",
    },
    loginPage: {
      signIn: "Banye",
      welcomeBack: "Nnọọ ọzọ",
      needRecovery: "Chọrọ iweghachi akaụntụ?",
    },
    recoveryPage: {
      title: "Rịọ maka iweghachi akaụntụ.",
      backToSignIn: "Laa na nbanye",
    },
  },
  yo: {
    layout: {
      brandTitle: "Pẹpẹ iṣẹ",
      signIn: "Wọle",
      signOut: "Jade",
      preferencesTitle: "Ede ati iwọn ọrọ",
      preferencesBody:
        "Yan ede ti o fẹ ki o si jẹ ki ọrọ rọrun lati ka.",
      languageLabel: "Ede",
      textSizeLabel: "Iwọn ọrọ",
      applyPreferences: "Lo ayipada",
      nav: {
        dashboard: "Pẹpẹ iṣakoso",
        requestCare: "Beere iranlọwọ",
        trackRequest: "Tẹle ìbéèrè",
        permissions: "Àṣẹ",
        signIn: "Wọle",
        teams: "Awọn ẹgbẹ",
        people: "Awọn eniyan",
        reports: "Àwọn ìròyìn",
        leaderView: "Wiwo olori",
        households: "Awọn idile",
        volunteerView: "Wiwo oluyọọda",
        notifications: "Àwọn ìfiranṣẹ",
        audit: "Ayẹwo",
        settings: "Ètò",
      },
      footerPrimary:
        "A kọ ọ fun awọn ẹgbẹ itọju ti wọn fẹ kedere, ìfẹ́, ati awọn handoff ti ko sọnu.",
      footerSecondary:
        "Awọn pastor, deacon, ati awọn oluyọọda wa ninu ìṣipopada kan ti o han gbangba.",
    },
    displayModes: {
      standard: "Deede",
      comfort: "Rọrun / ọrọ tobi",
    },
    requestNew: {
      kicker: "Fọọmu ọmọ ijọ",
      title: "Beere iranlọwọ laisi kọkọ mọ gbogbo eto ijọ.",
      trackRequest: "Tẹle ìbéèrè",
      permissions: "Wo matriki àṣẹ",
    },
    requestStatusPage: {
      kicker: "Iṣẹ ara ẹni",
      title: "Wo ibi ti ìbéèrè iranlọwọ rẹ wa.",
      submitCareRequest: "Firanṣẹ ìbéèrè iranlọwọ",
      accountRecovery: "Imularada account",
    },
  },
  ha: {
    layout: {
      brandTitle: "Allon aiki",
      signIn: "Shiga",
      signOut: "Fita",
      preferencesTitle: "Harshe da girman rubutu",
      preferencesBody:
        "Zaɓi harshen da kake so kuma ka sa rubutu ya fi sauƙin karantawa.",
      languageLabel: "Harshe",
      textSizeLabel: "Girman rubutu",
      applyPreferences: "Aiwatar",
      nav: {
        dashboard: "Babban allo",
        requestCare: "Nemi taimako",
        trackRequest: "Bi sawun buƙata",
        permissions: "Izini",
        signIn: "Shiga",
        teams: "Ƙungiyoyi",
        people: "Mutane",
        reports: "Rahotanni",
        leaderView: "Duba na shugaba",
        households: "Iyalai",
        volunteerView: "Duba na mai sa kai",
        notifications: "Sanarwa",
        audit: "Bincike",
        settings: "Saituna",
      },
    },
    displayModes: {
      standard: "Na yau da kullum",
      comfort: "Mai sauƙi / rubutu babba",
    },
    requestNew: {
      kicker: "Shigar mamba",
      title: "Nemi kulawa ba tare da fara bin tsarin coci ba.",
      trackRequest: "Bi sawun buƙata",
      permissions: "Duba jadawalin izini",
    },
  },
  es: {
    layout: {
      brandTitle: "Panel de operaciones",
      signIn: "Iniciar sesión",
      signOut: "Cerrar sesión",
      preferencesTitle: "Idioma y tamaño del texto",
      preferencesBody:
        "Elige tu idioma y haz que el texto sea más fácil de leer.",
      languageLabel: "Idioma",
      textSizeLabel: "Tamaño del texto",
      applyPreferences: "Aplicar",
      nav: {
        dashboard: "Panel",
        requestCare: "Solicitar cuidado",
        trackRequest: "Seguir solicitud",
        permissions: "Permisos",
        signIn: "Iniciar sesión",
        teams: "Equipos",
        people: "Personas",
        reports: "Informes",
        leaderView: "Vista de líder",
        households: "Hogares",
        volunteerView: "Vista de voluntario",
        notifications: "Notificaciones",
        audit: "Auditoría",
        settings: "Configuración",
      },
    },
    displayModes: {
      standard: "Estándar",
      comfort: "Cómodo / texto grande",
    },
    requestNew: {
      kicker: "Formulario de miembro",
      title: "Pide cuidado sin tener que entender primero toda la estructura de la iglesia.",
      description:
        "Un pastor o líder de cuidado revisa cada solicitud antes de derivarla. Las opciones de privacidad están en este formulario para que la persona decida su consentimiento al enviarlo.",
      trackRequest: "Seguir una solicitud",
      permissions: "Ver matriz de permisos",
    },
    requestStatusPage: {
      kicker: "Autoservicio del miembro",
      title: "Consulta el estado de tu solicitud de cuidado.",
      description:
        "Usa el código de seguimiento para ver un progreso claro y privado sin iniciar sesión.",
      submitCareRequest: "Enviar solicitud de cuidado",
      accountRecovery: "Recuperación de cuenta",
    },
    loginPage: {
      kicker: "Acceso interno",
      title: "Inicia sesión antes de abrir los flujos internos de cuidado.",
      description:
        "Las pantallas de pastor, líder, dueño y voluntario están protegidas con controles de acceso por rol.",
      welcomeBack: "Bienvenido de nuevo",
      useAssignedAccount: "Usa la cuenta asignada a tu función de cuidado.",
      needRecovery: "¿Necesitas recuperar tu cuenta?",
      trackRequest: "Seguir una solicitud de cuidado",
      demoAccounts: "Cuentas demo locales",
    },
    loginForm: {
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Escribe tu contraseña",
      signIn: "Iniciar sesión",
      signingIn: "Entrando...",
    },
    recoveryPage: {
      title: "Solicitar recuperación de cuenta.",
      backToSignIn: "Volver a iniciar sesión",
      trackInstead: "Seguir una solicitud",
    },
  },
  fr: {
    layout: {
      brandTitle: "Tableau des opérations",
      signIn: "Se connecter",
      signOut: "Se déconnecter",
      preferencesTitle: "Langue et taille du texte",
      preferencesBody:
        "Choisissez votre langue et rendez le texte plus facile à lire.",
      languageLabel: "Langue",
      textSizeLabel: "Taille du texte",
      applyPreferences: "Appliquer",
      nav: {
        dashboard: "Tableau",
        requestCare: "Demander de l’aide",
        trackRequest: "Suivre la demande",
        permissions: "Autorisations",
        signIn: "Se connecter",
        teams: "Équipes",
        people: "Personnes",
        reports: "Rapports",
        leaderView: "Vue leader",
        households: "Foyers",
        volunteerView: "Vue bénévole",
        notifications: "Notifications",
        audit: "Audit",
        settings: "Réglages",
      },
    },
    displayModes: {
      standard: "Standard",
      comfort: "Confort / texte plus grand",
    },
    requestNew: {
      kicker: "Formulaire membre",
      title: "Demandez de l’aide sans devoir comprendre d’abord toute la structure de l’église.",
      trackRequest: "Suivre une demande",
      permissions: "Voir la matrice des autorisations",
    },
    requestStatusPage: {
      kicker: "Libre-service membre",
      title: "Vérifiez l’état de votre demande d’aide.",
      submitCareRequest: "Envoyer une demande d’aide",
      accountRecovery: "Récupération de compte",
    },
    loginPage: {
      welcomeBack: "Bon retour",
      needRecovery: "Besoin de récupérer votre compte ?",
    },
  },
};

function deepMerge(base, overrides) {
  const result = { ...base };

  for (const [key, value] of Object.entries(overrides || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof base?.[key] === "object" &&
      base?.[key] !== null
    ) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function getCopy(language) {
  const code = normalizeLanguage(language);
  return deepMerge(englishDictionary, translatedDictionaries[code] || {});
}

export function getLanguageName(value) {
  return languageOptions.find((option) => option.value === value)?.label || "English";
}

export function getLanguageOptionsWithLabels(language) {
  const locale = getLocaleTag(language);

  return languageOptions.map((option) => ({
    ...option,
    label: new Intl.DisplayNames([locale], { type: "language" }).of(
      option.value === "en" ? "en" : option.value
    ) || option.label,
  }));
}

export function getDisplayModeOptionsWithLabels(language) {
  const copy = getCopy(language);

  return displayModeOptions.map((option) => ({
    ...option,
    label: copy.displayModes[option.value] || option.label,
  }));
}

export function translateSupportNeed(value, language) {
  const copy = getCopy(language);
  return copy.intakeForm.optionLabels[value] || value;
}

export function translateUrgencyOption(value, language, fallback) {
  const copy = getCopy(language);
  return copy.intakeForm.urgencyOptions[value] || fallback || value;
}

export function translateRoleLabel(role, language) {
  const copy = getCopy(language);
  return copy.layout.roleLabels[role] || role;
}
