export type FileCategory = 'audio' | 'video' | 'image' | 'document' | 'archive' | 'folder' | 'other';

export interface TeraBoxFile {
  id: string;
  name: string;
  size: number; // in bytes
  formattedSize: string; // e.g. "5.42 MB"
  category: FileCategory;
  extension: string;
  mimeType?: string;
  downloadUrl?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds (for audio/video)
  formattedDuration?: string; // e.g. "03:45"
  artist?: string;
  album?: string;
  bitrate?: string;
  updatedAt?: string;
  isDir: boolean;
  fsId?: string;
  path?: string;
  sourceType?: 'terabox-live';
}

export interface FolderStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  formattedTotalSize: string;
  audioCount: number;
  videoCount: number;
  imageCount: number;
  docCount: number;
  archiveCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
  primaryCategory: FileCategory;
}

export interface TeraBoxFolderResult {
  folderName: string;
  folderPath: string;
  shareUrl: string;
  shareKey?: string;
  ownerName?: string;
  ownerAvatar?: string;
  stats: FolderStats;
  files: TeraBoxFile[];
  folders: {
    name: string;
    path: string;
    itemCount?: number;
  }[];
  isAudioFolder: boolean;
  source: 'direct-api' | 'parsed-share';
  requiresCookie?: boolean;
  noticeMessage?: string;
  error?: string;
}

export interface AudioTrack extends TeraBoxFile {
  trackNumber?: number;
}

export type PlaybackMode = 'order' | 'repeat-all' | 'repeat-one' | 'shuffle';

export interface PlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 - 1
  isMuted: boolean;
  playbackRate: number; // 0.75, 1, 1.25, 1.5, 2
  playbackMode: PlaybackMode;
  playlist: AudioTrack[];
  currentIndex: number;
  isQueueOpen: boolean;
  isMiniMode: boolean;
}
