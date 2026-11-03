import { create } from 'zustand';
import { fetchFriendRequests, respondFriendRequest, type FriendRequest } from '@/services/api';

/**
 * Friend requests waiting for me, shared by the Social tab, the Today banner,
 * the tab-bar badge and notification taps — so a request is visible wherever
 * the user is, not only at the top of the leaderboard.
 */
interface FriendRequestsState {
  requests: FriendRequest[];
  refresh: () => Promise<void>;
  respond: (id: string, action: 'accept' | 'reject') => Promise<boolean>;
}

export const useFriendRequestsStore = create<FriendRequestsState>((set, get) => ({
  requests: [],
  refresh: async () => {
    try {
      set({ requests: await fetchFriendRequests() });
    } catch {}
  },
  respond: async (id, action) => {
    const before = get().requests;
    set({ requests: before.filter((r) => r.id !== id) }); // optimistic
    try {
      await respondFriendRequest(id, action);
      return true;
    } catch {
      set({ requests: before });
      return false;
    }
  },
}));
