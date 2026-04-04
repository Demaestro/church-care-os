import {
  displayModeOptions,
  getLocaleTag,
  languageOptions,
  normalizeLanguage,
  themeOptions,
} from "@/lib/app-preferences";

const englishDictionary = {
  layout: {
    brandKicker: "Church Care",
    brandTitle: "Operations board",
    signIn: "Sign in",
    signOut: "Sign out",
    switchAccount: "Switch account",
    memberTools: "Member tools",
    returnToWorkspace: "Return to workspace",
    preferencesTitle: "Language and text size",
    preferencesBody:
      "Choose the language you prefer and make the text easier to read.",
    languageLabel: "Language",
    textSizeLabel: "Text size",
    applyPreferences: "Apply",
    themeToggleLabel: "Dark mode",
    roleLabels: {
      member: "Member",
      public: "Public",
      owner: "Owner",
      overseer: "General Overseer",
      pastor: "Branch Pastor",
      leader: "Leader",
      volunteer: "Volunteer",
    },
    nav: {
      dashboard: "Dashboard",
      requestCare: "Request care",
      trackRequest: "Track request",
      memberPortal: "Member portal",
      permissions: "Permissions",
      signIn: "Sign in",
      teams: "Teams",
      people: "People",
      reports: "Reports",
      branches: "Branches",
      leaderView: "Leader view",
      schedule: "Schedule",
      households: "Households",
      volunteerView: "Volunteer view",
      notifications: "Notifications",
      audit: "Audit",
      settings: "Settings",
    },
    navGroups: {
      public: "Member tools",
      operations: "Care work",
      oversight: "Oversight",
    },
    workspaceReady: "Workspace ready",
    workspaceSignedIn: "Signed in as",
    publicEntryTitle: "Member help stays easy to reach.",
    publicEntryBody:
      "Request care, track a request, or open the member portal without signing in.",
    internalEntryTitle: "Switch internal roles without losing your place.",
    internalEntryBody:
      "Use the switch-account path to move between owner, pastor, leader, and volunteer workspaces more smoothly during review or training.",
    footerPrimary:
      "Built for care teams who want clarity, warmth, and fewer dropped handoffs.",
    footerSecondary:
      "Pastors, deacons, and volunteers stay in one visible rhythm.",
  },
  displayModes: {
    standard: "Standard",
    comfort: "Comfort / larger text",
    clarity: "Clarity / highest contrast",
  },
  themeModes: {
    light: "Light",
    dark: "Dark",
  },
  home: {
    greeting: (name) => `Good morning, ${name}`,
    newCareRequest: "+ New care request",
    boardKicker: "Today on the board",
    boardDescription:
      "Start from the area that matches the next decision you need to make. The board below is organised for quick movement between intake, follow-up, routing, and oversight.",
    launchpadTitle: "Start from the workspace you need",
    launchpadBody:
      "These routes cover the main care rhythm from intake to follow-up. Open the one that matches the task in front of you.",
    attentionTitle: "Start with what needs attention first",
    attentionBody:
      "These counts help you open the right workspace quickly instead of hunting through the whole app.",
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
    launchpad: {
      memberIntakeTitle: "Open member intake",
      memberIntakeBody:
        "Start a new request or share the intake page after service, prayer, or a pastoral conversation.",
      householdsTitle: "Review households",
      householdsBody:
        "Search open households, open timelines, and see which situations already have active support around them.",
      routingTitle: "Move work into lanes",
      routingBody:
        "Assign a volunteer, change ownership, or escalate a request before it stalls in the queue.",
      scheduleTitle: "Keep follow-up visible",
      scheduleBody:
        "Catch overdue touchpoints and reset the next care step before anyone is overlooked.",
      notificationsTitle: "Check new updates",
      notificationsBody:
        "Open the inbox for volunteer notes, escalations, and care updates that need a response.",
      reportsTitle: "See the pattern",
      reportsBody:
        "Review case ageing, owner load, and the mix of care needs across the church.",
    },
    attention: {
      unassignedCases: "Cases waiting for a first owner",
      followUps: "Follow-ups already overdue",
      unreadInbox: "Unread workflow updates",
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
    phoneLabel: "Phone for updates (optional, only if contact is allowed)",
    phonePlaceholder: "+2348012345678",
    phoneError: "Enter a phone number in international format, like +2348012345678.",
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
    privacyShield: {
      eyebrow: "Private member view",
      title: "Hide request details quickly on this device",
      body:
        "Browsers cannot fully block screenshots or camera captures, but this page adds a quick-hide layer and visible confidentiality markers so you can obscure details before sharing your screen or handing this device to someone else.",
      watermark: "Confidential member care",
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
    choosePathTitle: "Choose the quickest path",
    choosePathBody:
      "Members do not need an internal account. Staff and volunteers can sign in or switch workspaces from the same screen.",
    publicRouteTitle: "Public route",
    publicRouteBody:
      "Members can still submit a care request without signing in at /requests/new.",
    memberAccessTitle: "Continue as a member",
    memberAccessBody:
      "Open the member-safe tools without signing in. Request help, track a request, or open the member portal with your contact details.",
    internalAccessTitle: "Open an internal workspace",
    internalAccessBody:
      "Use your assigned internal account for owner, pastor, leader, or volunteer work. In local demo mode you can also open a workspace with one click.",
    welcomeBack: "Welcome back",
    useAssignedAccount: "Use the account assigned to your care role.",
    switchModeTitle: "Switch workspace",
    switchModeBody:
      "You can move into another internal workspace from here. Signing in again will replace the current session.",
    needRecovery: "Need account recovery?",
    trackRequest: "Track a care request",
    demoAccounts: "Local demo accounts",
    openRequestCare: "Request care",
    openMemberPortal: "Open member portal",
    openStatusLookup: "Track a request",
    backToWorkspace: "Back to current workspace",
    signOutCurrent: "Sign out current account",
    quickAccessTitle: "Quick demo access",
    quickAccessBody:
      "Use one click to open a demo workspace while you review the product locally.",
    openDemoWorkspace: "Open",
  },
  loginForm: {
    emailLabel: "Email",
    passwordLabel: "Password",
    emailPlaceholder: "pastor.lagos@firstlove.demo",
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
    title: "Send yourself a secure reset link.",
    description:
      "Use the email connected to your internal care account. If it matches an active account, we will send a one-time link so you can choose a new password safely.",
    nextTitle: "What happens next",
    nextBody:
      "If the email matches an active account, we send a time-limited reset link. If not, this screen still responds the same way so account details stay private.",
    supportTitle: "Need direct support?",
    supportBody: (email, phone) =>
      `${email || "Contact your church care team"}${phone ? ` or call ${phone}` : ""}.`,
    backToSignIn: "Back to sign in",
    trackInstead: "Track a request instead",
    tellUsTitle: "Tell us which account needs help",
    tellUsBody:
      "We respond the same way whether or not an account exists. Use the email tied to your care role if you know it.",
  },
  recoveryForm: {
    successKicker: "Reset request received",
    successTitle: "Check your email for the next step.",
    nameLabel: "Your name (optional)",
    namePlaceholder: "Name of the person requesting help",
    emailLabel: "Account email",
    emailPlaceholder: "you@example.com",
    noteLabel: "Anything we should know? (optional)",
    notePlaceholder:
      "For example: best callback number, ministry role, or why email access may be difficult",
    submit: "Send reset link",
    submitting: "Sending link...",
    actionMessages: {
      emailRequired: "Enter the email address connected to your care account.",
      emailInvalid: "Enter a valid email address.",
      fixFields: "Please correct the highlighted fields and try again.",
      rateLimited:
        "We have received several recovery requests from this connection in a short window. Please wait a bit and try again.",
      logged:
        "If the email matches an active account, we sent a secure reset link. If not, the response stays the same to protect privacy.",
    },
  },
  resetPasswordPage: {
    kicker: "Secure password reset",
    title: "Choose a new password.",
    description:
      "This reset link is time-limited and works only once. Pick a password you can remember but others cannot guess.",
    validFor: (label) => `This link stays active until ${label}.`,
    autoExpireBody:
      "After you save the new password, this link will stop working automatically.",
    invalidTitle: "This reset link cannot be used.",
    invalidBody:
      "The link may have expired, already been used, or been replaced by a newer request. Request a fresh link to continue.",
    requestNewLink: "Request a new link",
    backToSignIn: "Back to sign in",
  },
  resetPasswordForm: {
    successKicker: "Password updated",
    successTitle: "Your password has been changed.",
    successBody:
      "You can now return to sign in with the new password you just chose.",
    passwordLabel: "New password",
    passwordPlaceholder: "At least 8 characters",
    confirmPasswordLabel: "Confirm new password",
    confirmPasswordPlaceholder: "Type the same password again",
    submit: "Save new password",
    submitting: "Saving password...",
    actionMessages: {
      passwordRequired: "Enter a new password.",
      confirmPasswordRequired: "Confirm the new password.",
      minimumLength: "Use at least 8 characters for the new password.",
      mismatch: "The two password entries must match.",
      invalidLink: "This reset link is not valid anymore. Request a fresh one.",
      expiredLink: "This reset link has expired. Request a fresh one.",
      usedLink: "This reset link has already been used. Request a fresh one.",
      fixFields: "Please correct the highlighted fields and try again.",
      saved: "Your password has been updated successfully.",
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
  common: {
    flashNotice: "Saved",
    flashError: "Needs attention",
    searchLabel: "Search",
    searchPlaceholder: "Type a name, email, tag, or care note",
    clearFilters: "Clear filters",
    all: "All",
    allRoles: "All roles",
    allStatuses: "All statuses",
    allKinds: "All types",
    allOwners: "All owners",
    allRecoveryStatuses: "All recovery statuses",
    allRisks: "All risk levels",
    allAssignments: "All assignments",
    assigned: "Assigned",
    unassignedOnly: "Unassigned only",
    activeOnly: "Active only",
    inactiveOnly: "Inactive only",
    unreadOnly: "Unread only",
    readOnly: "Read only",
    showingResults: (visible, total) =>
      `Showing ${visible} of ${total}.`,
    member: "Member",
    user: "User",
    active: "Active",
    inactive: "Inactive",
    open: "Open",
    closed: "Closed",
    yes: "Yes",
    no: "No",
    unassigned: "Unassigned",
    notAssigned: "Not assigned",
    noTimeSet: "No time set",
    notSet: "Not set",
    noChannelsListed: "No channels listed",
    volunteerRoster: "Volunteer roster",
    available: "Available",
    notNeededInLogOnlyMode: "Not needed in log-only mode",
    notAttemptedYet: "Not attempted yet",
    noMatchesFound: "Nothing matched the current filters yet.",
    privacyShield: {
      quickHide: "Hide details",
      reveal: "Show details",
      hiddenTitle: "Details hidden for privacy",
      hiddenBody:
        "Sensitive details are now covered. Use the button above whenever you are ready to reveal them again.",
    },
    labels: {
      template: "Template",
      provider: "Provider",
      created: "Created",
      lastAttempt: "Last attempt",
      read: "Read",
      nextStep: "Next step",
      lastSeen: "Last seen",
    },
    stages: {
      Assign: "Assign",
      Stabilize: "Stabilize",
      Support: "Support",
      Review: "Review",
      Escalate: "Escalate",
      Comfort: "Comfort",
    },
    risks: {
      urgent: "Urgent",
      watch: "Watch",
      steady: "Steady",
      routine: "Routine",
      sensitive: "Sensitive",
      assigned: "Assigned",
      new: "New",
    },
    requestStatuses: {
      Open: "Open",
      Closed: "Closed",
    },
    timelineKinds: {
      "Follow-up": "Follow-up",
      Prayer: "Prayer",
      Visit: "Visit",
      Coordination: "Coordination",
      Review: "Review",
      Escalation: "Escalation",
      Request: "Request",
      Assignment: "Assignment",
      Completion: "Completion",
      Status: "Status",
    },
    recoveryStatuses: {
      open: "Open",
      issued: "Recovery sent",
      resolved: "Resolved",
      dismissed: "Dismissed",
    },
    outboxStatuses: {
      queued: "Queued",
      logged: "Logged",
      sent: "Sent",
      failed: "Failed",
    },
    notificationKinds: {
      escalation: "Escalation",
      task: "Task",
      "task-note": "Task note",
      "care-request": "Care request",
      account: "Account",
      update: "Update",
      "recovery-request": "Recovery request",
    },
    messageChannels: {
      sms: "SMS",
      whatsapp: "WhatsApp",
    },
    permissionAccess: {
      full: "Full access",
      own: "Own records only",
      none: "No access",
    },
  },
  memberPortal: {
    kicker: "Member care hub",
    title: "Review your care history without learning the internal workflow.",
    description:
      "Use the tracking code and the email or phone number from your request so you can see current and past care follow-up in one calm, privacy-safe place.",
    requestCare: "Request care",
    trackSingleRequest: "Track one request",
    lookupEyebrow: "Open your portal",
    lookupTitle: "Use one request to unlock your care history",
    lookupBody:
      "Enter a tracking code together with the email or phone number you used on that request. If they match, this page will show the other requests connected to that same contact detail.",
    helpTitle: "Need help?",
    helperBody:
      "Start with any recent tracking code and the email or phone number you used when you asked for care.",
    notFound:
      "We could not verify that combination yet. Check the tracking code and the contact detail you used on that request.",
    emptyPortal:
      "Once the code and contact match, your requests and households will appear here.",
    profileEyebrow: "Contact details",
    profileTitle: "Keep your follow-up details current",
    historyTitle: "Request history",
    householdsTitle: "Connected households",
    searchPlaceholder: "Search by household name, support type, or status",
    noMatches: "No requests in this portal match the current filters.",
    lastPlannedTouchpoint: "Last planned touchpoint:",
    connectedRequests: (count) =>
      `${count} open request${count === 1 ? "" : "s"} connected to this household.`,
    metrics: {
      totalRequests: "Total requests",
      openRequests: "Open requests",
      households: "Households",
    },
    statuses: {
      open: "Open",
      resolved: "Resolved",
    },
    fields: {
      trackingCode: "Tracking code",
      contact: "Email or phone used on the request",
      name: "Your name",
      preferredContact: "Preferred contact method",
      email: "Email",
      phone: "Phone",
      requestStatus: "Request status",
    },
    placeholders: {
      contact: "you@example.com or +2348012345678",
      name: "Tell us how you want your name to appear",
      preferredContact: "Phone, email, or what works best",
    },
    buttons: {
      openPortal: "Open member portal",
      saveProfile: "Save contact details",
      savingProfile: "Saving details...",
    },
    privacyShield: {
      eyebrow: "Private member view",
      title: "Keep your care history discreet on this screen",
      body:
        "This portal adds confidentiality markers and a quick-hide layer so you can cover names, updates, and contact details before someone else looks at your device.",
      watermark: "Confidential care history",
    },
  },
  leader: {
    kicker: "Ministry leader routing view",
    title: "Where pastor triage becomes lane ownership and volunteer handoff.",
    body:
      "This screen reads from the live request store, so assignments here immediately shape the volunteer, household, and notification views.",
    viewPermissions: "View permissions",
    previewVolunteerHandoff: "Preview volunteer handoff",
    metrics: {
      routedCases: "Routed cases",
      needsVolunteer: "Needs volunteer",
      pastorEscalations: "Pastor escalations",
      volunteersAvailable: "Volunteers available",
    },
    panels: {
      routedLane: "Routed into your lane",
      volunteerCapacity: "Volunteer capacity in this lane",
      visibility: "Visibility in this lane",
      escalations: "Escalations back to pastor",
      routingSequence: "The routing sequence for leaders",
    },
    emptyLane: "No live requests are currently routed into this lane.",
    assignmentHint: "Assignment hint",
    privacyBoundary: "Privacy boundary",
    currentAssignment: "Current assignment",
    volunteerLabel: "Volunteer",
    volunteerBrief: "Volunteer brief",
    assignVolunteer: "Assign volunteer",
    reassignVolunteer: "Reassign volunteer",
    savingAssignment: "Saving assignment...",
    volunteerAssignmentBlocked: "Volunteer assignment blocked",
    volunteerAssignmentBlockedBody:
      "This request is still pastor-only and cannot be routed to a volunteer until that boundary changes.",
    escalationReason: "Escalation reason",
    escalateToPastor: "Escalate to pastor",
    escalating: "Escalating...",
    openTimeline: "Open timeline",
    openVolunteerView: "Open volunteer view",
    noEscalations:
      "No requests are currently escalated back to pastor from this lane.",
    currentAssignmentBy: (name) => `${name} was assigned by`,
    leaderTeam: "the leader team",
    acceptedAt: (label) => `Accepted ${label}.`,
    visibilityRules: [
      "Only cases already routed into this lane appear here.",
      "Sensitive requests stay within the privacy boundary set by the pastor.",
      "Volunteers only receive the brief they need to act safely.",
    ],
    sequenceSteps: [
      "Receive only the cases already routed into your ministry lane.",
      "Match the case to a volunteer-safe brief and the best available team member.",
      "Send any ambiguity, sensitivity, or scope creep back to a pastor instead of widening access.",
    ],
    routeToday: "Route today",
    readyToAssign: "Ready to assign",
    needsOwner: "Needs owner",
    volunteerAccepted: "Volunteer accepted",
    assignedTo: (name) => `Assigned to ${name}`,
    pastorOnlyVisibility: "Pastor-only visibility is active on this request.",
    genericVolunteerBriefOnly: "Generic volunteer brief only.",
    volunteerSafeSummaryApproved: "Volunteer-safe summary approved.",
    bestFitMeal: "Best fit: meal support or short recovery visits.",
    bestFitTransport: "Best fit: transport or errand volunteer.",
    bestFitPrayer: "Best fit: short prayer call or encouragement follow-up.",
    bestFitGeneric: "Best fit: practical support with a clear, bounded brief.",
    reassignHint: (name) =>
      `Currently assigned to ${name}. Reassign only if the load or fit has changed.`,
    pastorOnlyBrief:
      "Pastor-only visibility is set on this request. Do not assign a volunteer yet.",
    sensitiveBrief:
      "Sensitive details are not shared with volunteers. Give a simple encouragement task and route all questions back to the care lead.",
    defaultBrief:
      "Follow the leader brief and route questions back to the care lead.",
  },
  households: {
    kicker: "Household board",
    title: "A live map of the people already in your care orbit.",
    description:
      "Each card now reads from the shared store, links into a household timeline, and reflects the latest request intake and note activity.",
    backToDashboard: "Back to dashboard",
    logNewRequest: "Log new request",
    summary: {
      openHouseholds: "Open households",
      openHouseholdsDetail:
        "Every visible household has a timeline and next touchpoint behind it.",
      urgentFollowUp: "Urgent follow-up",
      urgentFollowUpDetail:
        "These households need movement today from staff or ministry leads.",
      needsAssignment: "Needs assignment",
      needsAssignmentDetail:
        "Requests waiting on a named team, lead, or volunteer match.",
    },
    filters: {
      searchLabel: "Search households",
      searchPlaceholder: "Search by household, owner, need, or tag",
      riskLabel: "Risk",
      assignmentLabel: "Assignment",
      resultsSummary: (visible, total) => `Showing ${visible} of ${total} households.`,
      emptyResults:
        "No households match the current search yet. Try a different name, tag, or filter.",
      urgent: {
        title: "Urgent",
        description: "Immediate touchpoints, counseling, or rapid practical support.",
      },
      watch: {
        title: "Watch",
        description:
          "Healthy momentum, but the team should keep a close eye on the next step.",
      },
      steady: {
        title: "Steady",
        description: "Progress is moving; the main need is consistent follow-through.",
      },
    },
    activeKicker: "Active households",
    activeTitle: "Scan for risk, ownership, request load, and the next concrete move.",
    activeBody:
      "Open a household to update its snapshot, log notes, and close related requests without leaving the care workflow.",
    details: {
      owner: "Owner",
      nextTouchpoint: "Next touchpoint",
      lastTouchpoint: "Last touchpoint",
      openRequests: "Open requests",
    },
    openTimeline: "Open timeline",
    addRequest: "Add request",
  },
  householdDetail: {
    backToHouseholds: "Back to households",
    logRequest: "Log request",
    details: {
      owner: "Owner",
      nextTouchpoint: "Next touchpoint",
      lastTouchpoint: "Last touchpoint",
      openRequests: "Open requests",
      volunteer: "Volunteer",
      volunteerStatus: "Volunteer status",
      due: "Due",
      source: "Source",
    },
    cards: {
      requests: "Requests",
      workInMotion: "Work in motion",
      pastoralAttention: "Pastoral attention",
      escalation: "Escalation",
      timeline: "Timeline",
      notesAndTouchpoints: "Notes and touchpoints",
      updateSnapshot: "Update household snapshot",
      keepBoardCurrent: "Keep the board current",
      addTimelineNote: "Add timeline note",
      captureTouchpoint: "Capture the next touchpoint",
    },
    noRequests: "No requests are linked to this household yet.",
    escalation: "Escalation",
    markRequestClosed: "Mark request closed",
    closingRequest: "Closing request...",
    stageLabel: "Stage",
    riskLabel: "Risk",
    ownerLabel: "Owner",
    nextTouchpointLabel: "Next touchpoint",
    situationLabel: "Situation",
    situationPlaceholder: "What is happening right now?",
    summaryNoteLabel: "Summary note",
    summaryNotePlaceholder: "A concise handoff note for the next responder.",
    tagsLabel: "Tags",
    tagsPlaceholder: "Meals, Transport, Recovery",
    saveHouseholdUpdate: "Save household update",
    savingUpdate: "Saving update...",
    authorLabel: "Author",
    authorPlaceholder: "Care team",
    typeLabel: "Type",
    noteLabel: "Note",
    notePlaceholder: "What happened, and what should the next person know?",
    addNote: "Add timeline note",
    addingNote: "Adding note...",
    completedAt: (label) => `Completed ${label}`,
    acceptedAt: (label) => `Accepted ${label}`,
    assigned: "Assigned",
    awaitingVolunteer: "Awaiting volunteer",
    privacyShield: {
      eyebrow: "Branch confidential",
      title: "Use quick hide before stepping away from this branch record",
      body:
        "This page contains branch-scoped pastoral and household details. Quick hide covers the record fast, adds visible confidentiality markers, and helps reduce shoulder-surfing when the device is shared or left unattended.",
      watermark: "Branch confidential record",
    },
  },
  people: {
    kicker: "Access control",
    title: "People, roles, and recovery oversight.",
    description:
      "Manage who can enter internal care workflows, what lane they operate inside, and how account recovery gets handled with pastoral care rather than guesswork.",
    metrics: {
      activeAccounts: "Active accounts",
      openRecoveryRequests: "Open recovery requests",
      volunteers: "Volunteers",
      leaders: "Leaders",
    },
    filters: {
      searchLabel: "Search people and recovery requests",
      searchPlaceholder: "Search by name, email, lane, or note",
      roleLabel: "Role",
      statusLabel: "Account status",
      recoveryStatusLabel: "Recovery status",
      peopleSummary: (visible, total) => `Showing ${visible} of ${total} accounts.`,
      recoverySummary: (visible, total) =>
        `Showing ${visible} of ${total} recovery requests.`,
    },
    createAccount: {
      eyebrow: "Create account",
      title: "Add an internal care user",
      body:
        "Create owner, pastor, leader, or volunteer accounts from one place. Pastors can create leaders and volunteers; owners can create any role.",
    },
    fields: {
      fullName: "Full name",
      email: "Email",
      phone: "Phone number",
      role: "Role",
      lane: "Lane or team lane",
      volunteerDisplayName: "Volunteer display name",
      temporaryPassword: "Temporary password",
      activateImmediately: "Activate immediately",
      activateImmediatelyDetail:
        "Turn this off only if you want to create the profile before access goes live.",
      newPassword: "New password",
      resolutionNote: "Resolution note",
      status: "Status",
      adminNote: "Admin note",
      passwordReset: "Password reset",
      passwordResetBody:
        "Issue a new temporary password when the team member has been verified offline.",
      accountIsActive: "Account is active",
      accountIsActiveDetail:
        "Inactive users remain in the database but cannot sign in.",
    },
    placeholders: {
      fullName: "Sister Ngozi Okafor",
      email: "ngozi@gracecommunity.church",
      phone: "+2348012345678",
      lane: "Mercy & welfare lane",
      volunteerDisplayName: "Shown in volunteer task view",
      temporaryPassword: "Create a strong password",
      newPassword: "Set a new temporary password",
      verificationNote:
        "Verified identity by phone and issued a temporary password.",
      resolutionNote: "Record what was verified or why this was closed.",
      volunteerDisplayNameNeeded: "Only needed for volunteer accounts",
    },
    createButton: "Create account",
    creatingButton: "Creating account...",
    recovery: {
      eyebrow: "Recovery queue",
      title: "Handle manual recovery edge cases",
      body:
        "Use this queue when self-serve email reset is not enough or when someone needs offline help. Reset a password only after you have verified the requester.",
      none: "No recovery requests have been submitted yet.",
      recoveryRequest: "Recovery request",
      requested: "Requested",
      matchedAccount: "Matched account",
      noMatchedAccount: "No internal account matches this email yet.",
      resetAndResolve: "Reset password and resolve",
      resetting: "Resetting password...",
      updateRequest: "Update request",
      updating: "Updating...",
      statusOptions: {
        resolved: "Resolved",
        dismissed: "Dismissed",
        issued: "Recovery sent",
      },
    },
    directory: {
      eyebrow: "Directory",
      title: "Review each internal account",
      body:
        "Every account card below can be adjusted in place. Owners can manage every role. Pastors can manage leaders and volunteers.",
      emptyResults: "No internal accounts match the current search yet.",
      createdOn: "Created",
      saveAccessChanges: "Save access changes",
      savingChanges: "Saving changes...",
      setNewPassword: "Set new password",
      updatingPassword: "Updating password...",
      securityControls: "Security controls",
      sendInvite: "Send sign-in link",
      sendingInvite: "Sending link...",
      revokeSessions: "Revoke sessions",
      revokingSessions: "Revoking...",
      lockAccount: "Lock account",
      unlockAccount: "Unlock account",
      savingSecurity: "Saving...",
      lastLogin: "Last login",
      roleHistory: "Role history",
      noRoleHistory: "No role changes are recorded for this account yet.",
      sessionHistory: "Session activity",
      noSessionHistory: "No recent sign-in or sign-out activity is recorded yet.",
      oversightOnly:
        "This account is visible for oversight, but only an owner can manage users at this role level.",
    },
  },
  reports: {
    kicker: "Dashboard and reporting",
    title: "Understand the care system, not just the queue.",
    description:
      "Review request mix, team load, overdue follow-ups, and operational signals in one oversight surface. Export what you need for board or pastoral review.",
    exports: {
      cases: "Export cases",
      households: "Export households",
      users: "Export users",
      audit: "Export audit",
    },
    summary: {
      openCareRequests: "Open care requests",
      openCareRequestsDetail: (count) =>
        `${count} households need a follow-up touchpoint.`,
      activeVolunteers: "Active volunteers",
      activeVolunteersDetail: (count) =>
        `${count} ministry teams currently configured.`,
      resolvedRequests: "Resolved requests",
      resolvedRequestsDetail:
        "Closed requests remain in reporting until retention archives them.",
      recentAuditActivity: "Recent audit activity",
      recentAuditActivityDetail:
        "Latest auth and workflow events captured for oversight.",
    },
    panels: {
      needMix: "Need mix",
      stageMix: "Stage mix",
      volunteerCapacity: "Volunteer capacity",
      overdueFollowUps: "Overdue follow-ups",
      recentClosures: "Recent closures",
      governanceSnapshot: "Governance snapshot",
      intakeTrend: "New requests over the last 7 days",
      ownerLoad: "Household ownership load",
      sourceMix: "How requests entered the system",
      caseAging: "Open request aging",
    },
    noOverdue: "No overdue follow-ups are showing right now.",
    noClosures: "No closed requests are available yet.",
    noSliceData: "No reporting data is available for this slice yet.",
    searchPlaceholder: "Search volunteers, households, or recent closures",
    searchSummary: (visible, total) => `Showing ${visible} of ${total} searchable report items.`,
    governance: {
      plan: "Plan",
      backupPosture: "Backup posture",
      databasePath: "Database path",
      auditEventsLogged: "Audit events logged",
    },
  },
  teams: {
    kicker: "Ministry routing",
    title: "Shape the lanes behind care handoffs.",
    description:
      "Every routed case depends on clear lane ownership. Manage the teams, capabilities, and active volunteer surface that the rest of the app relies on.",
    metrics: {
      activeTeams: "Active teams",
      configuredVolunteers: "Configured volunteers",
      openRoutedCases: "Open routed cases",
    },
    create: {
      eyebrow: "Create lane",
      title: "Add a ministry team",
      body:
        "Create a new lane when a type of care needs its own owner, capabilities, and volunteer capacity.",
    },
    fields: {
      teamName: "Team name",
      laneName: "Lane name",
      leadName: "Lead name",
      contactEmail: "Contact email",
      description: "Description",
      capabilities: "Capabilities",
      teamIsActive: "Team is active",
      teamIsActiveDetail:
        "Inactive teams stay visible in the configuration list but no longer represent live routing capacity.",
      updatedDetail: (label) => `Last updated ${label}.`,
    },
    placeholders: {
      teamName: "Prayer & encouragement team",
      laneName: "Prayer & encouragement lane",
      leadName: "Pastor Emmanuel",
      contactEmail: "care@gracecommunity.church",
      description: "Describe what kind of care this lane should handle.",
      capabilities: "Prayer, Encouragement, Phone follow-up",
    },
    buttons: {
      create: "Create ministry team",
      creating: "Creating team...",
      save: "Save team changes",
      saving: "Saving team...",
    },
    cards: {
      leaders: "Leaders",
      volunteers: "Volunteers",
      openCases: "Open cases",
      assignedTasks: "Assigned tasks",
      laneLeaders: "Lane leaders",
      volunteerRoster: "Volunteer roster",
      noLeaders: "No leader accounts assigned yet.",
      noVolunteers: "No volunteers currently assigned to this lane.",
    },
  },
  settings: {
    kicker: "Owner controls",
    title: "Tune the church-wide operating layer.",
    description:
      "These settings shape the member intake language, support contacts, billing snapshot, and operations posture across the app.",
    metrics: {
      plan: "Plan",
      teamCount: "Team count",
      emailMode: "Email mode",
      messageMode: "Message mode",
      sentEmails: "Sent emails",
      sentMessages: "Sent messages",
    },
    sections: {
      churchProfile: {
        eyebrow: "Church profile",
        title: "Member-facing and billing settings",
        body:
          "Update the name, support contacts, intake confirmation text, and billing posture that appear across the product.",
      },
      emailDelivery: {
        eyebrow: "Email delivery",
        title: "Provider-ready transactional email",
        body:
          "Sender details live here. Provider secrets stay in environment variables, not in the database.",
      },
      messageDelivery: {
        eyebrow: "Phone and WhatsApp delivery",
        title: "Provider-ready text and chat alerts",
        body:
          "Configure the sender numbers and default delivery mode here. Provider credentials stay in environment variables, not in the database.",
      },
      operationalSnapshot: {
        eyebrow: "Operational snapshot",
        title: "Current system posture",
        body:
          "A quick owner view of the live data store and the operational load currently moving through the app.",
      },
      emailPosture: {
        eyebrow: "Email posture",
        title: "Delivery readiness and outbox health",
        body:
          "Log-only mode is safe for local rehearsal. Live delivery needs both a valid sender address and the Resend API key in the host environment.",
      },
      messagePosture: {
        eyebrow: "Message posture",
        title: "Text and WhatsApp readiness",
        body:
          "Log-only mode records every message safely. Live delivery needs valid sender numbers and Twilio credentials in the host environment.",
      },
      liveExperience: {
        eyebrow: "Live experience",
        title: "How members experience the system",
        body:
          "These are the values that shape the public request flow and ongoing communication expectations.",
      },
      deliveryTest: {
        eyebrow: "Delivery test",
        title: "Queue a test email",
        body:
          "This sends a branded test through the current mode. In log-only mode it still lands in the outbox so you can review the rendered message.",
      },
      messageDeliveryTest: {
        eyebrow: "Phone and WhatsApp test",
        title: "Queue a test message",
        body:
          "Use this to verify that text and WhatsApp delivery settings are logging or sending correctly before the team depends on them.",
      },
      outbox: {
        eyebrow: "Outbox",
        title: "Recent email activity",
        body:
          "Every delivery attempt is recorded here, even when live sending is turned off.",
      },
      messageOutbox: {
        eyebrow: "Message outbox",
        title: "Recent SMS and WhatsApp activity",
        body:
          "Every text or WhatsApp attempt is recorded here, even when live sending is turned off.",
      },
    },
    fields: {
      churchName: "Church name",
      campusName: "Campus name",
      supportEmail: "Support email",
      supportPhone: "Support phone",
      primaryTimezone: "Primary timezone",
      intakeConfirmationText: "Intake confirmation text",
      emergencyBanner: "Emergency banner",
      planName: "Plan name",
      seatAllowance: "Seat allowance",
      billingContactEmail: "Billing contact email",
      nextRenewal: "Next renewal",
      notificationChannels: "Notification channels",
      backupExpectation: "Backup expectation",
      deliveryMode: "Delivery mode",
      provider: "Provider",
      fromName: "From name",
      fromAddress: "From address",
      replyToAddress: "Reply-to address",
      subjectPrefix: "Subject prefix",
      messageDeliveryMode: "Message delivery mode",
      messageProvider: "Message provider",
      smsFromNumber: "SMS sender number",
      whatsappFromNumber: "WhatsApp sender number",
      recipientEmail: "Recipient email",
      recipientPhone: "Recipient phone",
      messageChannel: "Channel",
      optionalNote: "Optional note",
    },
    options: {
      logOnly: "Log only (capture emails without sending)",
      resend: "Resend API (live delivery)",
      twilio: "Twilio API (live delivery)",
      sms: "SMS text",
      whatsapp: "WhatsApp",
    },
    placeholders: {
      notificationChannels: "Phone follow-up, Text updates, In-person visit",
      fromName: "Grace Community Church Care Team",
      fromAddress: "care@yourchurch.org",
      replyToAddress: "care@yourchurch.org",
      subjectPrefix: "Grace Community Church",
      smsFromNumber: "+15005550006",
      whatsappFromNumber: "+14155238886",
      recipientEmail: "you@example.com",
      recipientPhone: "+2348012345678",
      testNote: "This is a test of the Church Care OS email delivery setup.",
      testMessageNote: "This is a test of the Church Care OS text and WhatsApp delivery setup.",
    },
    buttons: {
      saveSettings: "Save settings",
      savingSettings: "Saving settings...",
      sendTestEmail: "Send test email",
      queueingTest: "Queueing test...",
      sendTestMessage: "Send test message",
      queueingMessage: "Queueing message...",
    },
    snapshot: {
      databasePath: "Database path",
      households: "Households",
      openRequests: "Open requests",
      auditEvents: "Audit events",
      mode: "Mode",
      provider: "Provider",
      apiKeyConfigured: "API key configured",
      providerConfigured: "Provider configured",
      appBaseUrlConfigured: "App base URL configured",
      queued: "Queued",
      loggedOnly: "Logged only",
      sent: "Sent",
      failed: "Failed",
      currentConfirmationText: "Current confirmation text",
      currentEmergencyBanner: "Current emergency banner",
      currentContactChannels: "Current contact channels",
      noOutboxActivity: "No outbox activity yet",
      noOutboxActivityBody:
        "Workflow and test emails will appear here once the system starts queueing them.",
      noMessageOutboxActivity: "No message activity yet",
      noMessageOutboxActivityBody:
        "SMS and WhatsApp delivery attempts will appear here once the system starts queueing them.",
    },
  },
  notifications: {
    kicker: "Private inbox",
    title: "Notifications that keep care moving without widening access.",
    description:
      "This feed reflects only what belongs to your role and your account. New requests, routed tasks, password changes, and pastoral escalations arrive here with just enough context to act safely.",
    metrics: {
      unread: "Unread",
      total: "Total",
      role: "Role",
    },
    markAllRead: "Mark all as read",
    updating: "Updating...",
    backToWorkspace: "Back to workspace",
    filters: {
      status: "Read status",
      kind: "Notification type",
    },
    panels: {
      unreadTitle: "Needs your attention",
      unreadEyebrow: (count) => `Unread (${count})`,
      unreadEmpty:
        "You are all caught up. New care events will appear here as they happen.",
      readTitle: "Recent activity",
      readEyebrow: (count) => `Read (${count})`,
      readEmpty: "Read items will settle here after you open or mark them.",
    },
    open: "Open",
    opening: "Opening...",
    markAsRead: "Mark as read",
    saving: "Saving...",
  },
  audit: {
    kicker: "Oversight",
    title: "Audit trail and operations snapshot",
    description:
      "Sensitive care work needs a visible trail. This log captures auth and workflow mutations made inside the product.",
    metrics: {
      households: "Households",
      openRequests: "Open requests",
      auditEvents: "Audit events",
    },
    databaseLocation: "Database location",
    details: {
      actor: "Actor",
      role: "Role",
      action: "Action",
      target: "Target type",
    },
  },
  schedule: {
    kicker: "Follow-up planning",
    title: "Keep the next touchpoint visible before care starts to drift.",
    description:
      "This board turns household next-touchpoint dates into a simple planning rhythm for leaders and pastors. Use it to catch overdue follow-up, reassign ownership, and leave a planning note in one step.",
    searchPlaceholder: "Search by household, owner, or support type",
    nextTouchpoint: "Next touchpoint:",
    openHousehold: "Open household",
    empty: "No follow-up items match the current filters.",
    metrics: {
      overdue: "Overdue",
      today: "Today",
      thisWeek: "This week",
      later: "Later",
    },
    buckets: {
      overdue: "Overdue",
      today: "Today",
      thisWeek: "Next 7 days",
      later: "Later",
    },
    fields: {
      bucket: "Time bucket",
      owner: "Owner",
      nextTouchpoint: "Next touchpoint",
      note: "Planning note",
    },
    placeholders: {
      owner: "Mercy team",
      note: "Briefly note what should happen next",
    },
    buttons: {
      savePlan: "Save follow-up plan",
      savingPlan: "Saving plan...",
    },
  },
  permissions: {
    kicker: "Permission matrix",
    title: "The privacy model is visible in the UI, not hidden in policy.",
    description:
      "This table mirrors the access logic behind the care product. It makes two boundaries explicit: volunteers only see assigned work, and the pastor-only at-risk list never appears in general task views.",
    action: "Action",
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

export function getThemeOptionsWithLabels(language) {
  const copy = getCopy(language);

  return themeOptions.map((option) => ({
    ...option,
    label: copy.themeModes?.[option.value] || option.label,
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

export function translateStage(value, language) {
  const copy = getCopy(language);
  return copy.common.stages[value] || value;
}

export function translateRisk(value, language) {
  const copy = getCopy(language);
  return copy.common.risks[value] || value;
}

export function translateRequestStatus(value, language) {
  const copy = getCopy(language);
  return copy.common.requestStatuses[value] || value;
}

export function translateTimelineKind(value, language) {
  const copy = getCopy(language);
  return copy.common.timelineKinds[value] || value;
}

export function translateRecoveryStatus(value, language) {
  const copy = getCopy(language);
  return copy.common.recoveryStatuses[value] || value;
}

export function translateOutboxStatus(value, language) {
  const copy = getCopy(language);
  return copy.common.outboxStatuses[value] || value;
}

export function translateNotificationKind(value, language) {
  const copy = getCopy(language);
  return copy.common.notificationKinds[value] || value;
}

export function translateMessageChannel(value, language) {
  const copy = getCopy(language);
  return copy.common.messageChannels[value] || value;
}

export function translatePermissionAccess(value, language) {
  const copy = getCopy(language);
  return copy.common.permissionAccess[value] || value;
}
