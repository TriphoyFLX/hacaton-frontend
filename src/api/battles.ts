import { api } from './client';

type BattleMode = 'FRIENDLY' | 'RANKED';
type BattleStatus =
  | 'WAITING'
  | 'INVITING'
  | 'SELECTING_BEAT'
  | 'USER1_TURN'
  | 'USER2_TURN'
  | 'JUDGING'
  | 'FINISHED'
  | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  battleElo?: number;
  battleWins?: number;
  battleLosses?: number;
  battleDraws?: number;
  rankLabel?: string;
  createdAt: string;
  _count: {
    createdBattles: number;
    battleParticipants: number;
  };
}

export interface BattleRatingSnapshot {
  battleElo: number;
  battleWins: number;
  battleLosses: number;
  battleDraws: number;
  battleGames: number;
  rankId: string;
  rankLabel: string;
  rankMin: number;
  rankMax: number;
  nextRankLabel: string | null;
  nextRankMin: number | null;
  progressInRank: number;
  scaleProgress: number;
}

export interface Battle {
  id: string;
  title: string;
  description?: string;
  mode?: BattleMode;
  status: BattleStatus;
  creatorId: string;
  beatUrl?: string;
  beatName?: string;
  currentTurn?: 'USER1' | 'USER2';
  winner?: 'USER1' | 'USER2' | 'DRAW';
  judgedBy?: string | null;
  judgedAt?: string | null;
  votingEndsAt?: string | null;
  peerGraceEndsAt?: string | null;
  spectatorVoteCount?: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    username: string;
  };
  participants: {
    id: string;
    role: 'CREATOR' | 'OPPONENT' | 'JUDGE';
    acceptedAt?: string;
    user: {
      id: string;
      username: string;
    };
  }[];
  recordings: {
    id: string;
    userId: string;
    voiceUrl: string;
    beatUrl: string;
    duration: number;
    recordingQuality: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
    };
  }[];
  _count: {
    recordings: number;
  };
}

export interface BattleRecording {
  id: string;
  battleId: string;
  userId: string;
  round: 1 | 2;
  voiceUrl: string;
  beatUrl: string;
  duration: number;
  recordingQuality: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

export interface BattleJudge {
  id: string;
  battleId: string;
  judgeType: string;
  user1Flow: number;
  user1Lyrics: number;
  user1Delivery: number;
  user2Flow: number;
  user2Lyrics: number;
  user2Delivery: number;
  user1Total: number;
  user2Total: number;
  feedback?: string;
  confidence?: number;
  createdAt: string;
}

export interface SpectatorTally {
  user1: number;
  user2: number;
  total: number;
}

export interface BattleRatingResult {
  creatorRating: number | null;
  opponentRating: number | null;
  creatorReceived: number | null;
  opponentReceived: number | null;
  bothRated: boolean;
  hasRated: boolean;
  winner?: 'USER1' | 'USER2' | 'DRAW' | null;
  user1Score?: number | null;
  user2Score?: number | null;
  status: string;
  mode?: BattleMode;
  judgedBy?: string | null;
  judgedAt?: string | null;
  votingEndsAt?: string | null;
  peerGraceEndsAt?: string | null;
  voteCount?: number;
  myVote?: 'USER1' | 'USER2' | null;
  tally?: SpectatorTally | null;
  canSeeTally?: boolean;
  phase?: 'voting' | 'peer_grace' | 'finished' | 'recording' | 'waiting_judge';
  isParticipant?: boolean;
  isJudge?: boolean;
  judge?: { id: string; username: string; displayName: string | null; avatar: string | null } | null;
  minSpectatorVotes?: number;
}

export interface JudgingFeedBattle {
  id: string;
  title: string;
  beatUrl: string | null;
  votingEndsAt: string | null;
  spectatorVoteCount: number;
  creator: { id: string; username: string; displayName: string | null; avatar: string | null };
  opponent: { id: string; username: string; displayName: string | null; avatar: string | null } | null;
  recordings: Array<{
    id: string;
    userId: string;
    voiceUrl: string;
    beatUrl: string;
    duration: number;
    username: string;
  }>;
}

export type QueueStatusResponse =
  | { status: 'idle' }
  | { status: 'waiting'; elo: number; rank: BattleRatingSnapshot; queueSize: number; joinedAt?: string }
  | { status: 'matched'; battle: Battle };

export type JudgeQueueStatusResponse =
  | { status: 'idle' }
  | { status: 'waiting'; queueSize: number; joinedAt?: string }
  | { status: 'assigned'; battle: Battle };

type VoteStatus = {
  status: string;
  phase: string;
  votingEndsAt: string | null;
  peerGraceEndsAt: string | null;
  voteCount: number;
  myVote: 'USER1' | 'USER2' | null;
  tally: SpectatorTally | null;
  canSeeTally: boolean;
  winner?: 'USER1' | 'USER2' | 'DRAW' | null;
  judgedBy?: string | null;
  minSpectatorVotes: number;
};

type ApiError = { response?: { data?: { error?: string } }; message?: string };
const toError = (error: unknown, fallback: string) =>
  new Error((error as ApiError)?.response?.data?.error || (error as ApiError)?.message || fallback);

export const getAvailableUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<User[]>('/users/available');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch users');
  }
};

export const createBattle = async (title: string, description: string, opponentId: string): Promise<Battle> => {
  try {
    const response = await api.post<Battle>('/battles', { title, description, opponentId });
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to create battle');
  }
};

export const getUserBattles = async (): Promise<Battle[]> => {
  try {
    const response = await api.get<Battle[]>('/battles');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch battles');
  }
};

export const getBattleInvitations = async (): Promise<Battle[]> => {
  try {
    const response = await api.get<Battle[]>('/battles/invitations');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch invitations');
  }
};

export const respondToBattle = async (battleId: string, accept: boolean): Promise<void> => {
  try {
    await api.patch(`/battles/${battleId}/respond`, { accept });
  } catch (error) {
    throw toError(error, 'Failed to respond to battle');
  }
};

export const uploadBeatFile = async (file: File): Promise<{ url: string }> => {
  try {
    const formData = new FormData();
    formData.append('beat', file);
    const response = await api.post<{ url: string }>('/upload/beat', formData);
    return response.data;
  } catch (error) {
    throw toError(error, 'Upload failed');
  }
};

export const updateBattleBeat = async (battleId: string, beatUrl: string, beatName: string): Promise<void> => {
  try {
    await api.patch(`/battles/${battleId}/beat`, { beatUrl, beatName });
  } catch (error) {
    throw toError(error, 'Failed to update beat');
  }
};

export const updateBattleStatus = async (battleId: string, status: string): Promise<void> => {
  try {
    await api.patch(`/battles/${battleId}/status`, { status });
  } catch (error) {
    throw toError(error, 'Failed to update battle status');
  }
};

export const saveBattleRecording = async (
  battleId: string,
  audioFile: File,
  beatUrl: string,
  duration: number,
  recordingQuality = 'medium',
  round: 1 | 2 = 1,
): Promise<BattleRecording> => {
  try {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('beatUrl', beatUrl);
    formData.append('duration', duration.toString());
    formData.append('recordingQuality', recordingQuality);
    formData.append('round', round.toString());
    const response = await api.post<BattleRecording>(`/battles/${battleId}/recordings`, formData);
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to save recording');
  }
};

export const getBattleRecordings = async (battleId: string): Promise<BattleRecording[]> => {
  try {
    const response = await api.get<BattleRecording[]>(`/battles/${battleId}/recordings`);
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to get battle recordings');
  }
};

export const submitRating = async (
  battleId: string,
  rating: number,
): Promise<{ success: boolean; message: string } & BattleRatingResult> => {
  try {
    const response = await api.post<{ success: boolean; message: string } & BattleRatingResult>(
      `/battles/${battleId}/rate`,
      { rating },
    );
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to submit rating');
  }
};

export const getBattleRatings = async (battleId: string): Promise<BattleRatingResult> => {
  try {
    const response = await api.get<BattleRatingResult>(`/battles/${battleId}/ratings`);
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch ratings');
  }
};

export const submitJudgeVerdict = async (
  battleId: string,
  choice: 'USER1' | 'USER2',
): Promise<{ success: boolean; winner: 'USER1' | 'USER2'; judgedBy: string; status: string }> => {
  try {
    const response = await api.post<{ success: boolean; winner: 'USER1' | 'USER2'; judgedBy: string; status: string }>(
      `/battles/${battleId}/judge-verdict`,
      { choice },
    );
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to submit verdict');
  }
};

export const joinJudgeQueue = async (): Promise<JudgeQueueStatusResponse> => {
  try {
    const response = await api.post<JudgeQueueStatusResponse>('/battles/judge-queue');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to join judge queue');
  }
};

export const getJudgeQueueStatus = async (): Promise<JudgeQueueStatusResponse> => {
  try {
    const response = await api.get<JudgeQueueStatusResponse>('/battles/judge-queue/status');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to check judge queue');
  }
};

export const leaveJudgeQueue = async (): Promise<void> => {
  try {
    await api.delete('/battles/judge-queue');
  } catch (error) {
    throw toError(error, 'Failed to leave judge queue');
  }
};

export const getMyBattleRating = async (): Promise<BattleRatingSnapshot> => {
  try {
    const response = await api.get<BattleRatingSnapshot>('/battles/me/rating');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch battle rating');
  }
};

export const joinBattleQueue = async (payload: {
  title?: string;
  beatUrl: string;
  beatName?: string;
}): Promise<QueueStatusResponse> => {
  try {
    const response = await api.post<QueueStatusResponse>('/battles/queue', payload);
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to join queue');
  }
};

export const getBattleQueueStatus = async (): Promise<QueueStatusResponse> => {
  try {
    const response = await api.get<QueueStatusResponse>('/battles/queue/status');
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to check queue');
  }
};

export const leaveBattleQueue = async (): Promise<void> => {
  try {
    await api.delete('/battles/queue');
  } catch (error) {
    throw toError(error, 'Failed to leave queue');
  }
};

export const listJudgingBattles = async (): Promise<JudgingFeedBattle[]> => {
  try {
    const response = await api.get<{ battles?: JudgingFeedBattle[] }>('/battles/judging');
    return response.data.battles || [];
  } catch (error) {
    throw toError(error, 'Failed to list judging battles');
  }
};

export const castBattleVote = async (
  battleId: string,
  choice: 'USER1' | 'USER2',
): Promise<{
  success: boolean;
  myVote: 'USER1' | 'USER2';
  voteCount: number;
  tally: SpectatorTally;
  votingEndsAt: string | null;
}> => {
  try {
    const response = await api.post<{
      success: boolean;
      myVote: 'USER1' | 'USER2';
      voteCount: number;
      tally: SpectatorTally;
      votingEndsAt: string | null;
    }>(`/battles/${battleId}/vote`, { choice });
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to vote');
  }
};

export const getBattleVoteStatus = async (battleId: string): Promise<VoteStatus> => {
  try {
    const response = await api.get<VoteStatus>(`/battles/${battleId}/vote-status`);
    return response.data;
  } catch (error) {
    throw toError(error, 'Failed to fetch vote status');
  }
};
