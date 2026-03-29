function tokenizeQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function buildSearchBody(values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function matchesSearchQuery(values, query) {
  const tokens = tokenizeQuery(query);

  if (tokens.length === 0) {
    return true;
  }

  const haystack = buildSearchBody(values);
  return tokens.every((token) => haystack.includes(token));
}

export function filterHouseholds(households, filters = {}) {
  const query = String(filters.query || "");
  const risk = String(filters.risk || "all");
  const assignment = String(filters.assignment || "all");

  return households.filter((household) => {
    const matchesQuery = matchesSearchQuery(
      [
        household.name,
        household.owner,
        household.situation,
        household.summaryNote,
        household.tags,
        (household.relatedRequests || []).map((request) => request.need),
      ],
      query
    );
    const matchesRisk = risk === "all" ? true : household.risk === risk;
    const isAssigned =
      household.owner && household.owner !== "Unassigned" && household.owner !== "";
    const matchesAssignment =
      assignment === "all"
        ? true
        : assignment === "assigned"
          ? isAssigned
          : !isAssigned;

    return matchesQuery && matchesRisk && matchesAssignment;
  });
}

export function filterUsers(users, filters = {}) {
  const query = String(filters.query || "");
  const role = String(filters.role || "all");
  const status = String(filters.status || "all");

  return users.filter((user) => {
    const matchesQuery = matchesSearchQuery(
      [user.name, user.email, user.phone, user.role, user.lane, user.volunteerName],
      query
    );
    const matchesRole = role === "all" ? true : user.role === role;
    const matchesStatus =
      status === "all"
        ? true
        : status === "active"
          ? user.active
          : !user.active;

    return matchesQuery && matchesRole && matchesStatus;
  });
}

export function filterRecoveryRequests(requests, filters = {}) {
  const query = String(filters.query || "");
  const status = String(filters.status || "all");

  return requests.filter((request) => {
    const matchesQuery = matchesSearchQuery(
      [request.email, request.requesterName, request.note, request.resolutionNote],
      query
    );
    const matchesStatus = status === "all" ? true : request.status === status;

    return matchesQuery && matchesStatus;
  });
}

export function filterNotifications(notifications, filters = {}) {
  const query = String(filters.query || "");
  const status = String(filters.status || "all");
  const kind = String(filters.kind || "all");

  return notifications.filter((notification) => {
    const matchesQuery = matchesSearchQuery(
      [notification.title, notification.body, notification.kind],
      query
    );
    const matchesStatus =
      status === "all"
        ? true
        : status === "unread"
          ? !notification.read
          : notification.read;
    const matchesKind = kind === "all" ? true : notification.kind === kind;

    return matchesQuery && matchesStatus && matchesKind;
  });
}

export function filterVolunteerLoads(items, filters = {}) {
  return items.filter((item) =>
    matchesSearchQuery([item.name, item.team, item.lane, item.email], filters.query)
  );
}

export function filterOverdueFollowUps(items, filters = {}) {
  return items.filter((item) =>
    matchesSearchQuery([item.name, item.owner, item.dueLabel], filters.query)
  );
}

export function filterRecentClosures(items, filters = {}) {
  return items.filter((item) =>
    matchesSearchQuery([item.householdName, item.need, item.closedLabel], filters.query)
  );
}

export function hasActiveFilters(filters = {}) {
  return Object.values(filters).some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      value !== "all"
  );
}
