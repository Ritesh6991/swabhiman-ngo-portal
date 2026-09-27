const hasAdminAccess = (role) => ["admin", "owner"].includes(role);
const hasOwnerAccess = (role) => role === "owner";

module.exports = { hasAdminAccess, hasOwnerAccess };
