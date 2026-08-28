export const contentSecurityPolicyDirectives = {
  imgSrc: ["'self'", "data:", "blob:", "https:"],
  mediaSrc: ["'self'", "data:", "blob:", "https:"],
  frameSrc: [
    "'self'",
    "https://www.youtube-nocookie.com",
    "https://w.soundcloud.com",
  ],
  connectSrc: [
    "'self'",
    "https://www.youtube.com",
    "https://soundcloud.com",
  ],
};
