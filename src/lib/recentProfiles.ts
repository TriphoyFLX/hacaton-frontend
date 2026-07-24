import type { UserProfile } from '../api/profile';
import { profileApi } from '../api/profile';

const STORAGE_KEY = 'soundlab_recent_profiles';
const MAX_RECENT_PROFILES = 3;

export interface RecentProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  viewedAt: string;
}

export function getRecentProfiles(): RecentProfile[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((profile): profile is RecentProfile =>
      typeof profile?.id === 'string' && typeof profile?.username === 'string'
    ).slice(0, MAX_RECENT_PROFILES);
  } catch {
    return [];
  }
}

function saveRecentProfiles(profiles: RecentProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.slice(0, MAX_RECENT_PROFILES)));
}

export function addRecentProfile(profile: UserProfile): void {
  try {
    const entry: RecentProfile = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      viewedAt: new Date().toISOString(),
    };
    const recent = getRecentProfiles().filter((item) => item.id !== entry.id);
    saveRecentProfiles([entry, ...recent]);
  } catch {
    // History is optional and must not prevent profile navigation.
  }
}

/** Keep cached recent entries in sync after username/avatar changes. */
export function syncRecentProfile(
  profileId: string,
  patch: Partial<Pick<RecentProfile, 'username' | 'displayName' | 'avatar'>>,
): void {
  try {
    const recent = getRecentProfiles().map((item) =>
      item.id === profileId ? { ...item, ...patch } : item,
    );
    saveRecentProfiles(recent);
  } catch {
    // optional
  }
}

/** Refresh avatars/names from the API so recent list stays current. */
export async function refreshRecentProfiles(): Promise<RecentProfile[]> {
  const cached = getRecentProfiles();
  if (cached.length === 0) return [];

  const refreshed = await Promise.all(
    cached.map(async (item) => {
      try {
        const profile = await profileApi.getPublicProfile(item.username || item.id);
        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatar: profile.avatar,
          viewedAt: item.viewedAt,
        } satisfies RecentProfile;
      } catch {
        return item;
      }
    }),
  );

  try {
    saveRecentProfiles(refreshed);
  } catch {
    // ignore storage failures
  }

  return refreshed;
}
