/**
 * Generates a clean, deterministic Google/Email-style SVG data URI avatar
 * from the user's email address or full name when no custom profile picture is set.
 */
export function generateEmailDefaultAvatar(email?: string | null, fullName?: string | null): string {
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || 'scholar@examora.edu').trim();

  let initials = 'S';
  if (cleanName && cleanName.toLowerCase() !== 'scholar') {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }
  } else if (cleanEmail) {
    initials = cleanEmail[0].toUpperCase();
  }

  // Deterministic palette based on email hash (Google-style account colors)
  const palette = [
    '#0F172A', // Slate 900
    '#1D4ED8', // Blue 700
    '#047857', // Emerald 700
    '#4338CA', // Indigo 700
    '#0369A1', // Sky 700
    '#B45309', // Amber 700
    '#334155', // Slate 700
  ];

  let hash = 0;
  const seed = cleanEmail.toLowerCase();
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg = palette[Math.abs(hash) % palette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="64" fill="${bg}"/>
    <text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" fill="#FFFFFF" font-family="Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="48" letter-spacing="-1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns the user's custom uploaded/OAuth profile picture if present,
 * otherwise returns their deterministic default email avatar.
 */
export function getUserAvatarUrl(profile?: {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
} | null): string {
  if (profile?.avatarUrl && profile.avatarUrl.trim().length > 0) {
    return profile.avatarUrl;
  }
  return generateEmailDefaultAvatar(profile?.email, profile?.fullName);
}
