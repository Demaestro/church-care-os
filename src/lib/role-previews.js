export const permissionRoles = [
  {
    key: "member",
    label: "Member",
    pillClass: "bg-[#dff1ea] text-[#1f6c5a]",
  },
  {
    key: "volunteer",
    label: "Volunteer",
    pillClass: "bg-[#e8e2fb] text-[#4f46a8]",
  },
  {
    key: "leader",
    label: "Leader",
    pillClass: "bg-[#f4e7d2] text-[#8a5b0f]",
  },
  {
    key: "pastor",
    label: "Pastor",
    pillClass: "bg-[#dce8f9] text-[#255ea6]",
  },
  {
    key: "owner",
    label: "Owner",
    pillClass: "bg-[#f7e4dc] text-[#8f4d2d]",
  },
];

export const permissionLegend = [
  {
    key: "full",
    label: "Full access",
  },
  {
    key: "own",
    label: "Own records only",
  },
  {
    key: "none",
    label: "No access",
  },
];

export const permissionMatrixSections = [
  {
    title: "Care requests",
    rows: [
      {
        label: "Submit a care request",
        access: {
          member: "full",
          volunteer: "full",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View own request status",
        access: {
          member: "full",
          volunteer: "full",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View others' requests",
        access: {
          member: "none",
          volunteer: "own",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View sensitive requests",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Route / triage requests",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Escalate to pastor",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Close / resolve request",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
    ],
  },
  {
    title: "Care tasks",
    rows: [
      {
        label: "View assigned tasks",
        access: {
          member: "none",
          volunteer: "full",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Accept / decline task",
        access: {
          member: "none",
          volunteer: "full",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Mark task complete",
        access: {
          member: "none",
          volunteer: "own",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Assign tasks to others",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Add internal notes",
        access: {
          member: "none",
          volunteer: "own",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
    ],
  },
  {
    title: "Member records",
    rows: [
      {
        label: "View own profile",
        access: {
          member: "full",
          volunteer: "full",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View others' basic profiles",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View member timeline",
        access: {
          member: "own",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Edit member records",
        access: {
          member: "own",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View family unit",
        access: {
          member: "own",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
    ],
  },
  {
    title: "Dashboard & reporting",
    rows: [
      {
        label: "View open care cases",
        access: {
          member: "none",
          volunteer: "own",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "View overdue follow-ups",
        access: {
          member: "none",
          volunteer: "none",
          leader: "full",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: 'View "at risk" member list',
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Export reports",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
    ],
  },
  {
    title: "Administration",
    rows: [
      {
        label: "Manage ministry teams",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Manage volunteers",
        access: {
          member: "none",
          volunteer: "none",
          leader: "own",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Manage admin users",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "none",
          owner: "full",
        },
      },
      {
        label: "View audit logs",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "full",
          owner: "full",
        },
      },
      {
        label: "Manage billing & plan",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "none",
          owner: "full",
        },
      },
      {
        label: "Church settings",
        access: {
          member: "none",
          volunteer: "none",
          leader: "none",
          pastor: "none",
          owner: "full",
        },
      },
    ],
  },
];

export const permissionRules = [
  {
    title: "Volunteers only see what is assigned to them",
    detail:
      "They never browse the full request list. The task view stays narrow on purpose so practical care never turns into unnecessary visibility.",
  },
  {
    title: "The at-risk list is pastor-only",
    detail:
      "That panel surfaces patterns around people, not just work items, so it stays inside pastoral discretion and never appears in leader or volunteer screens.",
  },
];

export const atRiskMembers = [
  {
    name: "Michael Nwosu",
    initials: "MN",
    indicator: "No contact in 47 days - open prayer request",
    progress: 92,
    tone: "high",
  },
  {
    name: "Amaka Obi",
    initials: "AO",
    indicator: "No contact in 31 days - grief support case",
    progress: 66,
    tone: "medium",
  },
  {
    name: "Kingsley Eze",
    initials: "KE",
    indicator: "No contact in 28 days - financial case still open",
    progress: 56,
    tone: "watch",
  },
];

export const intakeSupportOptions = [
  "Prayer",
  "Counseling",
  "Hospital visit",
  "Financial help",
  "Meal support",
  "Transport",
  "Someone to talk to",
  "Grief support",
  "Other",
];

export const intakeUrgencyOptions = [
  {
    value: "no-rush",
    label: "This can wait - whenever someone is available",
  },
  {
    value: "this-week",
    label: "This week would help",
  },
  {
    value: "48-hours",
    label: "Within 48 hours would help",
  },
  {
    value: "today",
    label: "Today - this feels urgent",
  },
];

export const volunteerPreview = {
  volunteer: {
    name: "Sister Ngozi Okafor",
    team: "Mercy & welfare team",
  },
  tabs: {
    assigned: 3,
    completed: 1,
  },
  assigned: {
    overdue: [
      {
        id: "meal-delivery-joyce",
        title: "Meal delivery",
        memberName: "Joyce Akin",
        initials: "JA",
        detail: "New mother - Lekki area",
        instruction:
          "Prepare and deliver a warm meal. Joyce recently had a baby and is recovering at home. She has consented to a visit.",
        badge: "2 days overdue",
        badgeTone: "high",
        actions: ["Mark complete", "Add note"],
      },
    ],
    dueToday: [
      {
        id: "phone-checkin-ruth",
        title: "Phone check-in",
        memberName: "Ruth Okonkwo",
        initials: "RO",
        detail: "Going through a difficult season",
        instruction:
          "Sensitive details are not shared with volunteers. Call to check in and offer encouragement. Escalate to your team leader if she needs more support.",
        badge: "Due today",
        badgeTone: "watch",
        actions: ["Accept task", "Mark complete", "Add note"],
      },
    ],
    upcoming: [
      {
        id: "grocery-run-bamidele",
        title: "Grocery run",
        memberName: "Elder Bamidele",
        initials: "EB",
        detail: "Elderly, mobility limited - Surulere",
        instruction:
          "Pick up basic groceries and drop at the address your team leader will confirm with you. No entry to the home needed.",
        badge: "Due Thursday",
        badgeTone: "routine",
        actions: ["Accept task", "Add note"],
      },
    ],
  },
  completed: [
    {
      id: "completed-prayer-call",
      title: "Prayer call",
      memberName: "Funke Adeyemi",
      initials: "FA",
      detail: "Follow-up prayer completed yesterday",
      instruction:
        "Call was completed and the team leader was updated with the member's availability for another check-in next week.",
      badge: "Completed",
      badgeTone: "done",
      actions: [],
    },
  ],
};

export const leaderPreview = {
  leader: {
    name: "Deacon Bello",
    lane: "Mercy & welfare lane",
    church: "Grace Community Church",
  },
  metrics: [
    {
      label: "Routed cases",
      value: 8,
    },
    {
      label: "Needs volunteer",
      value: 3,
    },
    {
      label: "Pastor escalations",
      value: 1,
    },
    {
      label: "Volunteers available",
      value: 12,
    },
  ],
  routingQueue: [
    {
      id: "lane-joyce-meals",
      householdName: "Joyce Akin",
      initials: "JA",
      need: "Meal support",
      summary:
        "New mother recovering at home. Practical support can be coordinated and the member has consented to a brief doorstep visit.",
      assignmentHint: "Best fit: meals or short visits",
      privacy: "Volunteer-safe summary approved",
      status: "Route today",
      statusTone: "watch",
      actions: ["Assign volunteer", "Open timeline"],
    },
    {
      id: "lane-bamidele-groceries",
      householdName: "Elder Bamidele",
      initials: "EB",
      need: "Groceries and welfare check",
      summary:
        "Mobility is limited this week. Address can be shared with the assigned volunteer, but home entry is not required.",
      assignmentHint: "Best fit: errands and doorstep delivery",
      privacy: "Address only after assignment",
      status: "Needs match",
      statusTone: "routine",
      actions: ["Assign volunteer", "Add note"],
    },
    {
      id: "lane-ruth-encouragement",
      householdName: "Ruth Okonkwo",
      initials: "RO",
      need: "Encouragement touchpoint",
      summary:
        "Pastoral care is already in motion. The lane can coordinate a safe encouragement action, but the underlying situation stays tightly held.",
      assignmentHint: "Use a generic volunteer brief only",
      privacy: "Pastor-only detail retained",
      status: "Escalate if questions arise",
      statusTone: "sensitive",
      actions: ["Escalate to pastor", "Open timeline"],
    },
  ],
  volunteers: [
    {
      name: "Amina Okoye",
      role: "Meals and visits",
      load: "2 active tasks",
      availability: "Free Tuesday evening",
      fit: "Strong for Joyce's meal support",
    },
    {
      name: "Elder Tunde",
      role: "Errands and transport",
      load: "1 active task",
      availability: "Available Thursday morning",
      fit: "Best fit for Bamidele's grocery run",
    },
    {
      name: "Sister Ngozi Okafor",
      role: "Mercy follow-up",
      load: "3 active tasks",
      availability: "Can take one short encouragement task",
      fit: "Only use with a redacted brief",
    },
  ],
  visibilityRules: [
    "Leaders only see households already routed into their lane.",
    "They can coordinate volunteers, but not open the pastor-only risk list.",
    "Sensitive cases arrive as safe summaries or escalation prompts, not raw pastoral notes.",
  ],
  escalations: [
    {
      name: "Ruth Okonkwo",
      reason: "Leader should not widen visibility before pastoral review.",
      nextStep: "Hold the task at a generic encouragement brief and send questions back to Pastor Emmanuel.",
    },
  ],
};
