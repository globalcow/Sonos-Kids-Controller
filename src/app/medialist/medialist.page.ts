import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { MediaService } from '../media.service';
import { ArtworkService } from '../artwork.service';
import { PlayerService } from '../player.service';
import { Media } from '../media';
import { Artist } from '../artist';

@Component({
  selector: 'app-medialist',
  templateUrl: './medialist.page.html',
  styleUrls: ['./medialist.page.scss'],
})
export class MedialistPage implements OnInit {
  @ViewChild('slider', { static: false }) slider: IonSlides;

  artist: Artist;
  media: Media[] = [];
  covers = {};

  slideOptions = {
    initialSlide: 0,
    slidesPerView: 3,
    autoplay: false,
    loop: false,
    freeMode: true,
    freeModeSticky: true,
    freeModeMomentumBounce: false,
    freeModeMomentumRatio: 1.0,
    freeModeMomentumVelocityRatio: 1.0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private artworkService: ArtworkService,
    private playerService: PlayerService
  ) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.artist = this.router.getCurrentNavigation().extras.state.artist;
      }
    });
  }

  ngOnInit() {
    // Subscribe
    this.mediaService.getMediaFromArtist(this.artist).subscribe(media => {
      this.media = media;

      this.media.forEach(currentMedia => {
        this.artworkService.getArtwork(currentMedia).subscribe(url => {
          this.covers[currentMedia.title] = url;
        });
      });
      this.slider.update();

      // Workaround as the scrollbar handle isn't visible after the immediate update
      // Seems like a size calculation issue, as resizing the browser window helps
      // Better fix for this? 
      window.setTimeout(() => {
        this.slider.update();
      }, 1000);
    });

    // Retreive data through subscription above
    this.mediaService.publishArtistMedia();
  }

  coverClicked(clickedMedia: Media) {
    const navigationExtras: NavigationExtras = {
      state: {
        media: clickedMedia
      }
    };
    this.router.navigate(['/player'], navigationExtras);
  }

  mediaNameClicked(clickedMedia: Media) {
    this.playerService.getConfig().subscribe(config => {
      if (config.tts == null || config.tts.enabled === true) {
        this.playerService.say(clickedMedia.title);
      }
    });
  }

  hasBookmark(media: Media) {
    const state = this.playerService.getSavedPlayState(media);

    if (state && media.category === 'audiobook' && !state.complete) {
      const timeDiff = Date.now() - state.tstamp;

      if (timeDiff < 604800000) { // 1 week
        return true;
      }
    }
  }

  bookmarkClicked(clickedMedia: Media) {
    const navigationExtras: NavigationExtras = {
      state: {
        bookmark: true,
        media: clickedMedia
      }
    };
    this.router.navigate(['/player'], navigationExtras);
  }

  slideDidChange() {
    // console{}.log('Slide did change');
  }

  slidePrev() {
    this.slider.slidePrev();
  }

  slideNext() {
    this.slider.slideNext();
  }

}
