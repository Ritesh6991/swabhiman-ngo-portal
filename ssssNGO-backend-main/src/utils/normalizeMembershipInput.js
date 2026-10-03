const normalizeOptionalMembershipFields = (input = {}) => {
  const normalized = { ...input };
  const maritalStatus = normalized.maritalStatus;

  if (maritalStatus == null || (typeof maritalStatus === "string" && maritalStatus.trim() === "")) {
    delete normalized.maritalStatus;
  }

  return normalized;
};

module.exports = { normalizeOptionalMembershipFields };
