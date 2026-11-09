export const contentSecurityPolicyDirectives = {
  scriptSrc: [
    "'self'",
    "https://accounts.google.com/gsi/client",
    "https://static.cloudflareinsights.com",
    "https://connect.facebook.net",
  ],
  imgSrc: ["'self'", "data:", "blob:", "https:"],
  mediaSrc: ["'self'", "data:", "blob:", "https:"],
  frameSrc: [
    "'self'",
    "https://accounts.google.com/gsi/",
    "https://www.facebook.com",
    "https://www.youtube-nocookie.com",
    "https://www.youtube.com",
    "https://w.soundcloud.com",
  ],
  connectSrc: [
    "'self'",
    "https://accounts.google.com/gsi/",
    "https://cloudflareinsights.com",
    "https://people.googleapis.com",
    "https://www.facebook.com",
    "https://graph.facebook.com",
    "https://www.youtube.com",
    "https://soundcloud.com",
  ],
};
