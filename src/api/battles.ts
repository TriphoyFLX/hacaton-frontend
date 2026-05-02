const API_BASE = 'http://localhost:5002/api';

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Battle API types
export interface User {
  id: string;
  username: string;
  createdAt: string;
  _count: {
    createdBattles: number;
    battleParticipants: number;
  };
}

export interface Battle {
  id: string;
  title: string;
  description?: string;
  status: 'WAITING' | 'INVITING' | 'SELECTING_BEAT' | 'USER1_TURN' | 'USER2_TURN' | 'JUDGING' | 'FINISHED' | 'CANCELLED';
  creatorId: string;
  beatUrl?: string;
  beatName?: string;
  winner?: 'USER1' | 'USER2' | 'DRAW';
  judgedBy?: string;
  judgedAt?: string;
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

// API Functions

// Get available users for battle invitations
export const getAvailableUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE}/users/available`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

// Create new battle
export const createBattle = async (title: string, description: string, opponentId: string): Promise<Battle> => {
  const response = await fetch(`${API_BASE}/battles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, description, opponentId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create battle');
  }
  
  return response.json();
};

// Get user's battles
export const getUserBattles = async (): Promise<Battle[]> => {
  const response = await fetch(`${API_BASE}/battles`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch battles');
  }
  
  return response.json();
};

// Get pending battle invitations
export const getBattleInvitations = async (): Promise<Battle[]> => {
  const response = await fetch(`${API_BASE}/battles/invitations`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch invitations');
  }
  
  return response.json();
};

// Respond to battle invitation
export const respondToBattle = async (battleId: string, accept: boolean): Promise<void> => {
  console.log(`Frontend: Responding to battle ${battleId}, accept=${accept}`);
  console.log(`Frontend: Token exists:`, !!localStorage.getItem('token'));
  
  const response = await fetch(`${API_BASE}/battles/${battleId}/respond`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ accept })
  });
  
  console.log(`Frontend: Response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.json();
    console.log(`Frontend: Error response:`, error);
    throw new Error(error.error || 'Failed to respond to battle');
  }
  
  console.log(`Frontend: Battle response successful`);
};

// Update battle beat
export const updateBattleBeat = async (battleId: string, beatUrl: string, beatName: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/battles/${battleId}/beat`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ beatUrl, beatName })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update beat');
  }
};

// Save battle recording
export const saveBattleRecording = async (
  battleId: string,
  audioFile: File,
  beatUrl: string,
  duration: number,
  recordingQuality: string = 'medium'
): Promise<BattleRecording> => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('beatUrl', beatUrl);
  formData.append('duration', duration.toString());
  formData.append('recordingQuality', recordingQuality);
  
  const response = await fetch(`${API_BASE}/battles/${battleId}/recordings`, {
    method: 'POST',
    headers: {
      ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save recording');
  }
  
  return response.json();
};

// Judge battle with AI
export const judgeBattle = async (battleId: string): Promise<{
  judge: BattleJudge;
  winner: 'USER1' | 'USER2' | 'DRAW';
  user1Total: number;
  user2Total: number;
}> => {
  const response = await fetch(`${API_BASE}/battles/${battleId}/judge`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to judge battle');
  }
  
  return response.json();
};
