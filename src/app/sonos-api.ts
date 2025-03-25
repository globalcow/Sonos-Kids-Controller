export interface SonosApiConfig {
    server: string;
    port: string;
    rooms: string[];
    tts?: {
        enabled?: boolean;
        language?: string;
        volume?: string;
    };
}

export interface SonosApiTrack {
  artist: string;
  title: string;
  album: string;
  albumArtURI: string;
  duration: number;
  uri: string;
}
export interface SonosApiState {
  currentTrack: SonosApiTrack;
  nextTrack: SonosApiTrack;
  volume: number;
  mute: boolean;
  trackNo: number;
  elapsedTime: number;
  elapsedTimeFormatted: string;
  zoneState: string;
  playerState: string | "PLAYING" | "PAUSED_PLAYBACK";
  playMode: {
    shuffle: boolean;
    repeat: "none" | "all" | "one";
    crossfade: boolean;
  };
  equalizer: {
    bass: number;
    treble: number;
    loudness: boolean;
  };
}
