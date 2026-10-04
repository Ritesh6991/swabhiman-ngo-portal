export const documentLabels = { photo: "Photo", aadhaar: "Aadhaar", pan: "PAN" };

export const selectableMissingDocuments = (documents = {}) => Object.entries(documents)
  .filter(([, value]) => value?.canSubmit)
  .map(([kind]) => kind);

export const recoverySummary = (documents = {}) => {
  const values = Object.values(documents);
  if (values.length && values.every((item) => item.available)) return "complete";
  if (values.some((item) => item.pending)) return "pending";
  return "missing";
};
