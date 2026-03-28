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
      [user.name, user.email, user.role, user.lane, user.volunteerName],
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

export function hasActiveFilters(filters = {}) {
  return Object.values(filters).some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      value !== "all"
  );
}
