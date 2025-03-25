import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';
import { SonosApiConfig, SonosApiState } from './sonos-api';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';

export enum PlayerCmds {
  PLAY = 'play',
  PAUSE = 'pause',
  PLAYPAUSE = 'playpause',
  PREVIOUS = 'previous',
  NEXT = 'next',
  VOLUMEUP = 'volume/+5',
  VOLUMEDOWN = 'volume/-5',
  CLEARQUEUE = 'clearqueue'
}

export interface SaveState {
  id: string;
  media: Media;
  trackNo: number;
  elapsedTime: number;
  tstamp: number;
  complete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  private config: Observable<SonosApiConfig> = null;

  constructor(private http: HttpClient) {}

  getSavedPlayState(media: Media): SaveState | undefined {
    const saveStateString = window.localStorage.getItem('SavedPlayState');
    if (!saveStateString) return;
    const saveState: Record<string, SaveState> = JSON.parse(saveStateString);
    return saveState[JSON.stringify([media.id,media.artist,media.title])];
  }

  setSavedPlayState(state: SaveState) {
    let saveState: Record<string, SaveState> = {};
    let saveStateString = window.localStorage.getItem('SavedPlayState');
    if (saveStateString) saveState = JSON.parse(saveStateString);
    saveState[state.id] = state;
    window.localStorage.setItem('SavedPlayState', JSON.stringify(saveState));
  }

  getConfig() {
    // Observable with caching:
    // publishReplay(1) tells rxjs to cache the last response of the request
    // refCount() keeps the observable alive until all subscribers unsubscribed
    if (!this.config) {
      const url = (environment.production) ? '../api/sonos' : 'http://localhost:8200/api/sonos';

      this.config = this.http.get<SonosApiConfig>(url).pipe(
        publishReplay(1), // cache result
        refCount()
      );
    }

    return this.config;
  }

  getState(onComplete?: (state: SonosApiState) => void) {
    this.sendRequest('state', onComplete);
  }

  sendCmd(cmd: PlayerCmds) {
    this.sendRequest(cmd);
  }

  playMedia(media: Media, onComplete?: (data: any) => void) {
    let url: string;

    switch (media.type) {
      case 'applemusic': {
        if (media.category === 'playlist') {
          url = 'applemusic/now/playlist:' + encodeURIComponent(media.id);
        } else {
          url = 'applemusic/now/album:' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'amazonmusic': {
        if (media.category === 'playlist') {
          url = 'amazonmusic/now/playlist:' + encodeURIComponent(media.id);
        } else {
          url = 'amazonmusic/now/album:' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'library': {
        if (!media.id) {
          media.id = media.title;
        }
        if (media.category === 'playlist') {
          url = 'playlist/' + encodeURIComponent(media.id);
        } else {
          url = 'musicsearch/library/album/' + encodeURIComponent(media.id);
        }
        break;
      }
      case 'spotify': {
        if (media.category === 'playlist') {
          url = 'spotify/now/spotify:user:spotify:playlist:' + encodeURIComponent(media.id);
        } else {
          if (media.id) {
            url = 'spotify/now/spotify:album:' + encodeURIComponent(media.id);
          } else {
            url = 'musicsearch/spotify/album/artist:"' + encodeURIComponent(media.artist) + '" album:"' + encodeURIComponent(media.title) + '"';
          }
        }
        break;
      }
      case 'tunein': {
        url = 'tunein/play/' + encodeURIComponent(media.id);
        break;
      }
    }

    this.sendRequest(url, onComplete);
  }

  say(text: string) {
    this.getConfig().subscribe(config => {
      let url = 'say/' + encodeURIComponent(text) + '/' + ((config.tts?.language?.length > 0) ? config.tts.language : 'de-de');

      if (config.tts?.volume?.length > 0) {
        url += '/' + config.tts.volume;
      }

      this.sendRequest(url);
    });
  }

  sendTrackseekCmd(trackNumber: number, onComplete?: (data: any) => void) {
    this.sendRequest('trackseek/' + trackNumber, onComplete);
  }

  sendTimeseekCmd(seconds: number, onComplete?: (data: any) => void) {
    this.sendRequest('timeseek/' + seconds, onComplete);
  }

  savePlayState(media: Media) {

    this.setSavedPlayState({
      id: JSON.stringify([media.id,media.artist,media.title]),
      media: media,
      trackNo: 1,
      elapsedTime: 0,
      tstamp: Date.now(),
      complete: false,
    });

    this.getState(state => {
      this.setSavedPlayState({
        id: JSON.stringify([media.id,media.artist,media.title]),
        media: media,
        trackNo: state.trackNo,
        elapsedTime: state.elapsedTime,
        tstamp: Date.now(),
        complete: state.nextTrack.duration === 0 && state.currentTrack.duration - state.elapsedTime < 60,
      });
    });
  }

  loadPlayState(media: Media) {
    const state = this.getSavedPlayState(media);
    this.playMedia(state.media, () => this.sendTrackseekCmd(state.trackNo, () => this.sendTimeseekCmd(state.elapsedTime)));
  }

  private sendRequest(url: string, onComplete: (data: any) => void = () => undefined) {
    this.getConfig().subscribe(config => {
      const baseUrl = 'http://' + config.server + ':' + config.port + '/' + config.rooms[0] + '/';
      this.http.get(baseUrl + url).subscribe(onComplete);
    });
  }
}
