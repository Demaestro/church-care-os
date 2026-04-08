const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const followUpPlaybooks = [
  {
    id: "first-response",
    title: "First pastoral response",
    description: "Acknowledge the request quickly, offer prayer, and confirm the next check-in.",
    followUpRhythm: "48-hour response rhythm",
    followUpGoal: "Initial reassurance and pastoral connection",
    followUpTemplate: "first-response",
    discipleshipStage: "foundation",
    defaultOutcome: "reached",
    nextTouchpointOffsetMs: 2 * DAY,
    noteKind: "Pastoral response",
    note:
      "Reached out with reassurance, prayed with the member, and confirmed the next check-in.",
  },
  {
    id: "hospital-recovery",
    title: "Hospital recovery",
    description: "Check on recovery, practical needs, and family support after treatment or discharge.",
    followUpRhythm: "72-hour recovery rhythm",
    followUpGoal: "Recovery support and practical care planning",
    followUpTemplate: "hospital-recovery",
    discipleshipStage: "growing",
    defaultOutcome: "practical",
    nextTouchpointOffsetMs: 3 * DAY,
    noteKind: "Recovery follow-up",
    note:
      "Checked on recovery progress, practical needs, and the next supportive touchpoint.",
  },
  {
    id: "grief-support",
    title: "Grief support",
    description: "Create a calm rhythm of prayer, presence, and gentle check-ins for bereavement care.",
    followUpRhythm: "Weekly bereavement rhythm",
    followUpGoal: "Consistent grief support and pastoral presence",
    followUpTemplate: "grief-support",
    discipleshipStage: "growing",
    defaultOutcome: "prayed",
    nextTouchpointOffsetMs: 7 * DAY,
    noteKind: "Grief support",
    note:
      "Shared prayer, listened carefully, and set the next gentle grief support check-in.",
  },
  {
    id: "new-believer",
    title: "New believer care",
    description: "Keep early discipleship steady with prayer, scripture, and a clear next spiritual step.",
    followUpRhythm: "Weekly discipleship rhythm",
    followUpGoal: "New believer encouragement and next-step discipleship",
    followUpTemplate: "new-believer",
    discipleshipStage: "new_believer",
    defaultOutcome: "discipleship",
    nextTouchpointOffsetMs: 7 * DAY,
    noteKind: "Discipleship follow-up",
    note:
      "Encouraged prayer and scripture habits, then confirmed the next discipleship step.",
  },
  {
    id: "return-to-church",
    title: "Return to church encouragement",
    description: "Reconnect someone gently after a gap in attendance or community touch.",
    followUpRhythm: "Five-day reconnection rhythm",
    followUpGoal: "Warm reconnection into branch life",
    followUpTemplate: "return-to-church",
    discipleshipStage: "foundation",
    defaultOutcome: "another_visit",
    nextTouchpointOffsetMs: 5 * DAY,
    noteKind: "Reconnection",
    note:
      "Reached out with encouragement, invited reconnection, and planned the next touchpoint.",
  },
];

export function getFollowUpPlaybook(playbookId = "") {
  return followUpPlaybooks.find((playbook) => playbook.id === playbookId) || null;
}

export function buildPlaybookTouchpoint(playbook, now = new Date()) {
  if (!playbook?.nextTouchpointOffsetMs) {
    return "";
  }

  return new Date(now.getTime() + playbook.nextTouchpointOffsetMs).toISOString();
}
