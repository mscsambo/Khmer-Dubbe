export interface Subtitle {
  id: string;
  start: number;
  end: number;
  khmerText: string;
  voiceProfile: 'Male' | 'Female';
  status: 'Pending' | 'Generating' | 'Ready' | 'Error';
  audioUrl?: string;
}

export interface AppState {
  videoUrl: string | null;
  bgmUrl: string | null;
  subtitles: Subtitle[];
  currentTime: number;
  duration: number;
  isMuted: boolean;
}
