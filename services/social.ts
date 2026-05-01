import { api } from './client';

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string | null;
  avatar: string;
  avatarImage?: string | null;
  calories: number;
  streak: number;
  rank: number;
  isMe: boolean;
  friendshipId?: string;
}

export interface FriendRequest {
  id: string;
  from: { id: string; name: string; username: string | null; avatar: string; avatarImage?: string | null };
  createdAt: string;
}

export interface SentRequest {
  id: string;
  to: { id: string; name: string; username: string | null; avatar: string; avatarImage?: string | null };
  createdAt: string;
}

export interface ChallengeData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  participants: number;
  creatorName: string;
}

export interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  status: string;
  creatorName: string;
  participants: { userId: string; name: string; progress: number; joinedAt: string }[];
}

export interface FeedItem {
  id: string;
  type: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  isMe: boolean;
  user: { id: string; name: string; avatar: string; avatarImage?: string | null };
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await api.get<LeaderboardEntry[]>('/api/social/leaderboard');
  return res.data;
};

export const fetchFriends = async (): Promise<LeaderboardEntry[]> => {
  const res = await api.get<LeaderboardEntry[]>('/api/social/friends');
  return res.data;
};

export const searchUser = async (q: string): Promise<{
  user: { id: string; name: string; username: string | null; avatarEmoji: string; avatarImage?: string | null; bio?: string | null } | null;
  relationStatus?: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  self?: boolean;
}> => {
  const res = await api.get(`/api/social/users/search?q=${encodeURIComponent(q)}`);
  return res.data;
};

export const sendFriendRequest = async (identifier: string): Promise<void> => {
  await api.post('/api/social/friends', { identifier });
};

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
  const res = await api.get<FriendRequest[]>('/api/social/friends/requests');
  return res.data;
};

export const respondFriendRequest = async (id: string, action: 'accept' | 'reject'): Promise<void> => {
  await api.patch(`/api/social/friends/${id}`, { action });
};

export const fetchSentRequests = async (): Promise<SentRequest[]> => {
  const res = await api.get<SentRequest[]>('/api/social/friends/sent');
  return res.data;
};

export const cancelFriendRequest = async (id: string): Promise<void> => {
  await api.delete(`/api/social/friends/${id}`);
};

export const removeFriend = async (friendshipId: string): Promise<void> => {
  await api.delete(`/api/social/friends/${friendshipId}`);
};

export const fetchInviteCode = async (): Promise<string> => {
  const res = await api.get<{ inviteCode: string }>('/api/social/invite-code');
  return res.data.inviteCode;
};

export const fetchChallenges = async (): Promise<ChallengeData[]> => {
  const res = await api.get<ChallengeData[]>('/api/social/challenges');
  return res.data;
};

export const createChallenge = async (data: {
  title: string;
  description?: string;
  type: string;
  goalValue: number;
  startDate: string;
  endDate: string;
}): Promise<void> => {
  await api.post('/api/social/challenges', data);
};

export const joinChallenge = async (challengeId: string): Promise<void> => {
  await api.post(`/api/social/challenges/${challengeId}/join`);
};

export const fetchFeed = async (): Promise<FeedItem[]> => {
  const res = await api.get<FeedItem[]>('/api/social/feed');
  return res.data;
};

export const fetchChallengeDetail = async (challengeId: string): Promise<ChallengeDetail> => {
  const res = await api.get<ChallengeDetail>(`/api/social/challenges/${challengeId}`);
  return res.data;
};

export interface MomentComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string; avatarImage?: string | null };
}

export interface Moment {
  id: string;
  content: string;
  mediaUrl?: string | null;
  createdAt: string;
  isMe: boolean;
  user: { id: string; name: string; avatar: string; avatarImage?: string | null };
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  previewComments: MomentComment[];
}

export const fetchMoments = async (): Promise<Moment[]> => {
  const res = await api.get<Moment[]>('/api/social/moments');
  return res.data;
};

export const createMoment = async (content: string, mediaUrl?: string | null): Promise<Moment> => {
  const res = await api.post<Moment>('/api/social/moments', { content, mediaUrl: mediaUrl ?? null });
  return res.data;
};

export const deleteMoment = async (id: string): Promise<void> => {
  await api.delete(`/api/social/moments/${id}`);
};

export const toggleMomentLike = async (id: string): Promise<{ liked: boolean; count: number }> => {
  const res = await api.post<{ liked: boolean; count: number }>(`/api/social/moments/${id}/like`);
  return res.data;
};

export const fetchMomentComments = async (id: string): Promise<MomentComment[]> => {
  const res = await api.get<MomentComment[]>(`/api/social/moments/${id}/comments`);
  return res.data;
};

export const addMomentComment = async (id: string, content: string): Promise<MomentComment> => {
  const res = await api.post<MomentComment>(`/api/social/moments/${id}/comments`, { content });
  return res.data;
};

export const reportMoment = async (postId: string, reason: string): Promise<void> => {
  await api.post('/api/social/report', { postId, reason });
};
