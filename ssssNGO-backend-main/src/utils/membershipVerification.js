const verificationUrlFor = (memberId, baseUrl = process.env.FRONTEND_URL || "https://swabhimanshikshasanskriti.in") => {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}/?verify=${encodeURIComponent(memberId)}`;
};

module.exports = { verificationUrlFor };
