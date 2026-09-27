const path = require("path");
const fs = require("fs");

const resolveInside = (root, filename) => {
  if (!filename || path.basename(filename) !== filename) return null;
  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absoluteRoot, filename);
  if (!resolved.startsWith(`${absoluteRoot}${path.sep}`) || !fs.existsSync(resolved)) return null;
  return resolved;
};

const sendPrivateFile = (res, root, filename, { download = false } = {}) => {
  const resolved = resolveInside(root, filename);
  if (!resolved) return res.status(404).json({ message: "File not found" });
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return download ? res.download(resolved) : res.sendFile(resolved);
};

module.exports = { resolveInside, sendPrivateFile };
