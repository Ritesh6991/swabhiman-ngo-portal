export const isTrackablePath = (path) => Boolean(path) && !/^\/admin(?:\/|$)/i.test(path);
