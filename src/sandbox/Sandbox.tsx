import './Sandbox.css';

import React from 'react';

import {
  EContentType,
  EErrorSeverity,
  EEvent,
  ELogLevel,
  EManifestType,
  EPlayerState,
  ICue,
  ISeekableRange,
  ITimedEvents,
  Tape
} from '../';
import assets from './assets/assets';
import IAsset from './assets/interfaces/IAsset';
import Assets from './components/Assets';
import Buffering from './components/Buffering';
import Controls from './components/Controls';
import Stats from './components/Stats';
import Subtitles from './components/Subtitles';
import Timeline from './components/Timeline';
import Version from './components/Version';

type IProps = Record<string, never>;
type IState = {
  currentAsset: IAsset | null;
  manifestType: EManifestType;
  currentTime: number;
  seekableRange: ISeekableRange;
  audioBitrate: number;
  textBitrate: number;
  videoBitrate: number;
  audioBuffer: Array<Array<number>>;
  videoBuffer: Array<Array<number>>;
  estimatedBandwidth: number;
  playerState: EPlayerState;
  cdn: string;
  volume: number;
  muted: boolean;
  playbackRate: number;
  videoTrack: number | null;
  videoTracks: Array<number>;
  audioTrack: string;
  audioTracks: Array<string>;
  textTrack: string | null;
  textTracks: Array<string>;
  fullscreen: boolean;
  pictureInPicture: boolean;
  cues: Array<ICue>;
  memoryHeap: number;
  error: {code: string; message: string} | null;
};

class Sandbox extends React.Component<IProps, IState> {
  private tape: Tape | null = null;
  private _tapeContainerRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private _interval: number;

  private _initialState: IState = {
    currentAsset: null,
    manifestType: EManifestType.STATIC,
    currentTime: 0,
    seekableRange: {start: 0, end: 0, availabilityStartTime: 0},
    audioBitrate: 0,
    textBitrate: 0,
    videoBitrate: 0,
    audioBuffer: [],
    videoBuffer: [],
    estimatedBandwidth: 0,
    playerState: EPlayerState.UNKNOWN,
    cdn: '',
    volume: 0,
    muted: false,
    playbackRate: 1,
    videoTrack: null,
    videoTracks: [],
    audioTrack: '',
    audioTracks: [],
    textTrack: null,
    textTracks: [],
    fullscreen: false,
    pictureInPicture: false,
    cues: [],
    memoryHeap: 0,
    error: null
  };

  constructor(props: IProps) {
    super(props);
    this.state = {...this._initialState};

    this._interval = window.setInterval(() => {
      this.setState({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        memoryHeap: window.performance.memory.usedJSHeapSize / 1000000
      });
    }, 1000);
  }

  componentDidMount(): void {
    const currentAsset: IAsset = assets[0];
    this.setState(
      {
        currentAsset
      },
      () => this.onLoad()
    );
  }

  private onLoad = (): void => {
    if (!this.state.currentAsset) return;

    this.tape = new Tape(this._tapeContainerRef.current as HTMLDivElement, {
      eme: {...this.state.currentAsset.eme},
      logger: {
        enabled: true,
        level: ELogLevel.DEBUG
      },
      cdn: {
        cdns: ['http://localhost:8080/', 'http://localhost:8082/']
      },
      stream: {
        autoplay: false,
        startingPosition: 0
      }
    });
    this.addListeners();

    this.tape?.load(this.state.currentAsset.manifestUrl);

    this.tape?.volume(0.2);
  };

  private addListeners(): void {
    this.tape?.addEventListener(EEvent.ACTIVE_ADAPTATION_CHANGE, this.onActiveAdaptationChange);
    this.tape?.addEventListener(EEvent.ACTIVE_REPRESENTATION_CHANGE, this.onActiveRepresentationChange);
    this.tape?.addEventListener(EEvent.AVAILABLE_TRACKS, this.onAvailableTracks);
    this.tape?.addEventListener(EEvent.BUFFERS_UPDATE, this.onBuffersUpdate);
    this.tape?.addEventListener(EEvent.CDN_CHANGE, this.onCdnChange);
    this.tape?.addEventListener(EEvent.CUE_ENTER, this.onCueEnter);
    this.tape?.addEventListener(EEvent.CUE_EXIT, this.onCueExit);
    this.tape?.addEventListener(EEvent.ESTIMATED_BANDWIDTH, this.onEstimatedBandwidth);
    this.tape?.addEventListener(EEvent.FULLSCREEN_CHANGE, this.onFullscreenChange);
    this.tape?.addEventListener(EEvent.MANIFEST_READY, this.onManifestReady);
    this.tape?.addEventListener(EEvent.PLAYER_STATE_CHANGE, this.onPlayerStateChange);
    this.tape?.addEventListener(EEvent.PICTURE_IN_PICTURE_ENTER, this.onPictureInPictureEnter);
    this.tape?.addEventListener(EEvent.PICTURE_IN_PICTURE_LEAVE, this.onPictureInPictureLeave);
    this.tape?.addEventListener(EEvent.RATE_CHANGE, this.onRateChange);
    this.tape?.addEventListener(EEvent.SEEKABLE_RANGE_CHANGE, this.onSeekableRangeChange);
    this.tape?.addEventListener(EEvent.TAPE_ERROR, this.onTapeError);
    this.tape?.addEventListener(EEvent.TIME_UPDATE, this.onTimeUpdate);
    this.tape?.addEventListener(EEvent.VOLUME_CHANGE, this.onVolumeChange);
  }

  private onActiveAdaptationChange = (
    activeAdaptationChangeEvent: ITimedEvents[EEvent.ACTIVE_ADAPTATION_CHANGE]
  ): void => {
    const {lang, contentType} = activeAdaptationChangeEvent.detail;

    switch (contentType) {
      case EContentType.AUDIO:
        this.setState({
          audioTrack: lang as string
        });
        break;
      case EContentType.TEXT:
        {
          this.setState({
            textTrack: lang
          });
          if (!lang) {
            this.setState({
              textBitrate: 0
            });
          }
        }
        break;
    }
  };

  private onActiveRepresentationChange = (
    activeRepresentationChangeEvent: ITimedEvents[EEvent.ACTIVE_REPRESENTATION_CHANGE]
  ): void => {
    const {bandwidth, contentType} = activeRepresentationChangeEvent.detail;

    switch (contentType) {
      case EContentType.VIDEO:
        this.setState({
          videoTrack: bandwidth,
          videoBitrate: bandwidth / 1000
        });
        break;
      case EContentType.AUDIO:
        this.setState({
          audioBitrate: bandwidth / 1000
        });
        break;
      case EContentType.TEXT:
        this.setState({
          textBitrate: bandwidth / 1000
        });
        break;
    }
  };

  private onAvailableTracks = (availableTracksEvent: ITimedEvents[EEvent.AVAILABLE_TRACKS]): void => {
    const {contentType, tracks} = availableTracksEvent.detail;
    switch (contentType) {
      case EContentType.VIDEO:
        this.setState({
          videoTracks: [...(tracks as Array<number>)]
        });
        break;
      case EContentType.AUDIO:
        this.setState({
          audioTracks: [...(tracks as Array<string>)]
        });
        break;
      case EContentType.TEXT:
        this.setState({
          textTracks: [...(tracks as Array<string>)]
        });
        break;
    }
  };

  private onBuffersUpdate = (buffersUpdateEvent: ITimedEvents[EEvent.BUFFERS_UPDATE]): void => {
    const {audioBuffered, videoBuffered} = buffersUpdateEvent.detail;
    this.setState({
      audioBuffer: this.getBufferRanges(audioBuffered)
    });
    this.setState({
      videoBuffer: this.getBufferRanges(videoBuffered)
    });
  };

  private onCdnChange = (cdnChangeEvent: ITimedEvents[EEvent.CDN_CHANGE]): void => {
    const {cdn} = cdnChangeEvent.detail;
    this.setState({cdn});
  };

  private onCueEnter = (cueEnterEvent: ITimedEvents[EEvent.CUE_ENTER]): void => {
    const {data} = cueEnterEvent.detail;
    this.setState((prevState: IState) => ({
      cues: [...prevState.cues, data]
    }));
  };

  private onCueExit = (cueExitEvent: ITimedEvents[EEvent.CUE_EXIT]): void => {
    const {id} = cueExitEvent.detail;

    this.setState((prevState: IState) => {
      const cues: Array<ICue> = prevState.cues.filter((cue: ICue) => cue.id !== id);

      return {
        cues: [...cues]
      };
    });
  };

  private onFullscreenChange = (fullscreenChangeEvent: ITimedEvents[EEvent.FULLSCREEN_CHANGE]): void => {
    const {fullscreen} = fullscreenChangeEvent.detail;
    this.setState({
      fullscreen
    });
  };

  private onManifestReady = (manifestReadyEvent: ITimedEvents[EEvent.MANIFEST_READY]): void => {
    const {manifest} = manifestReadyEvent.detail;
    this.setState({
      manifestType: manifest.type
    });
  };

  private onPictureInPictureEnter = (
    _pictureInPictureEnterEvent: ITimedEvents[EEvent.PICTURE_IN_PICTURE_ENTER]
  ): void => {
    this.setState({
      pictureInPicture: true
    });
  };

  private onPictureInPictureLeave = (
    _pictureInPictureLeaveEvent: ITimedEvents[EEvent.PICTURE_IN_PICTURE_LEAVE]
  ): void => {
    this.setState({
      pictureInPicture: false
    });
  };

  private onEstimatedBandwidth = (
    estimatedBandwidthEvent: ITimedEvents[EEvent.ESTIMATED_BANDWIDTH]
  ): void => {
    const {estimatedBandwidth} = estimatedBandwidthEvent.detail;
    this.setState({estimatedBandwidth: estimatedBandwidth / 1000});
  };

  private onPlayerStateChange = (playerStateChangeEvent: ITimedEvents[EEvent.PLAYER_STATE_CHANGE]): void => {
    const {playerState, currentTime} = playerStateChangeEvent.detail;
    this.setState({
      playerState,
      currentTime
    });
  };

  private onRateChange = (rateChangeEvent: ITimedEvents[EEvent.RATE_CHANGE]): void => {
    const {playbackRate} = rateChangeEvent.detail;
    this.setState({
      playbackRate
    });
  };

  private onSeekableRangeChange = (
    seekableRangeChangeEvent: ITimedEvents[EEvent.SEEKABLE_RANGE_CHANGE]
  ): void => {
    const {seekableRange} = seekableRangeChangeEvent.detail;
    this.setState({
      seekableRange
    });
  };

  private onTapeError = (tapeErrorEvent: ITimedEvents[EEvent.TAPE_ERROR]): void => {
    const {severity, code, message} = tapeErrorEvent.detail;
    if (severity === EErrorSeverity.FATAL) {
      this.setState({
        error: {
          code,
          message
        }
      });
    }
  };

  private onTimeUpdate = (timeUpdateEvent: ITimedEvents[EEvent.TIME_UPDATE]): void => {
    const {currentTime} = timeUpdateEvent.detail;
    this.setState({
      currentTime
    });
  };

  private onVolumeChange = (volumeChangeEvent: ITimedEvents[EEvent.VOLUME_CHANGE]): void => {
    const {volume, muted} = volumeChangeEvent.detail;
    this.setState({
      volume,
      muted
    });
  };

  private onAssetChange = (asset: IAsset): void => {
    this.onDestroy();

    this.setState(
      {
        currentAsset: asset
      },
      () => this.onLoad()
    );
  };

  private onPause = (): void => {
    this.tape?.pause();
  };

  private onPlay = (): void => {
    this.tape?.play();
  };

  private onMute = (): void => {
    this.tape?.mute();
  };

  private onUnmute = (): void => {
    this.tape?.unmute();
  };

  private onVolume = (volume: number): void => {
    this.tape?.volume(volume);
  };

  private onTimelineSeek = (time: number): void => {
    this.tape?.seekTo(time);
  };

  private onPlaybackRate = (rate: number): void => {
    this.tape?.playbackRate(rate);
  };

  private onSeek = (time: number): void => {
    this.tape?.seek(time);
  };

  private onSeekToLiveEdge = (): void => {
    this.tape?.seekToLiveEdge();
  };

  private onVideoTrack = (quality: number | null): void => {
    this.tape?.chooseVideoQuality(quality);
  };

  private onAudioTrack = (lang: string): void => {
    this.tape?.chooseAudioLanguage(lang);
  };

  private onTextTrack = (lang: string | null): void => {
    this.tape?.chooseTextLanguage(lang);
  };

  private onEnterFullscreen = (): void => {
    this.tape?.enterFullscreen();
  };

  private onExitFullscreen = (): void => {
    this.tape?.exitFullscreen();
  };

  private onRequestPictureInPicture = (): void => {
    this.tape?.requestPictureInPicture();
  };

  private onLeavePictureInPicture = (): void => {
    this.tape?.leavePictureInPicture();
  };

  private onDestroy = (): void => {
    this.tape?.destroy();
    this.tape = null;
    this.setState({...this._initialState, playerState: EPlayerState.STOPPED});
  };

  private getBufferRanges = (timeRanges: TimeRanges): Array<Array<number>> => {
    const bufferRanges: Array<Array<number>> = [];
    for (let i: number = 0; i < timeRanges.length; i++) {
      const start: number = timeRanges.start(i);
      const end: number = timeRanges.end(i);
      bufferRanges.push([start, end]);
    }

    if (bufferRanges.length > 0) {
      return bufferRanges;
    }

    return [[0, 0]];
  };

  componentWillUnmount(): void {
    this.onDestroy();
    window.clearInterval(this._interval);
  }

  render(): JSX.Element {
    return (
      <>
        <h1>
          Sandbox <Version />
        </h1>
        <div className="player-config">
          <Assets currentAsset={this.state.currentAsset} onAssetChange={this.onAssetChange} />
        </div>
        <div className="player-container" ref={this._tapeContainerRef}>
          <Buffering playerState={this.state.playerState} />
          <Subtitles cues={this.state.cues} />
          {![EPlayerState.UNKNOWN, EPlayerState.STOPPED].includes(this.state.playerState) && (
            <div className="player-controls">
              <Timeline
                currentTime={this.state.currentTime}
                seekableRange={this.state.seekableRange}
                buffer={this.state.videoBuffer}
                onSeek={this.onTimelineSeek}
              />
              <Controls
                manifestType={this.state.manifestType}
                playerState={this.state.playerState}
                currentTime={this.state.currentTime}
                seekableRange={this.state.seekableRange}
                volume={this.state.volume}
                muted={this.state.muted}
                playbackRate={this.state.playbackRate}
                videoTrack={this.state.videoTrack}
                videoTracks={this.state.videoTracks}
                audioTrack={this.state.audioTrack}
                audioTracks={this.state.audioTracks}
                textTrack={this.state.textTrack}
                textTracks={this.state.textTracks}
                fullscreen={this.state.fullscreen}
                pictureInPicture={this.state.pictureInPicture}
                onMute={this.onMute}
                onUnmute={this.onUnmute}
                onVolume={this.onVolume}
                onPause={this.onPause}
                onPlay={this.onPlay}
                onPlaybackRate={this.onPlaybackRate}
                onSeek={this.onSeek}
                onSeekToLiveEdge={this.onSeekToLiveEdge}
                onVideoTrack={this.onVideoTrack}
                onAudioTrack={this.onAudioTrack}
                onTextTrack={this.onTextTrack}
                onEnterFullscreen={this.onEnterFullscreen}
                onExitFullscreen={this.onExitFullscreen}
                onRequestPictureInPicture={this.onRequestPictureInPicture}
                onLeavePictureInPicture={this.onLeavePictureInPicture}
                onDestroy={this.onDestroy}
              />
            </div>
          )}
        </div>
        <Stats
          manifestType={this.state.manifestType}
          playerState={this.state.playerState}
          currentTime={this.state.currentTime}
          seekableRange={this.state.seekableRange}
          volume={this.state.volume}
          muted={this.state.muted}
          audioBitrate={this.state.audioBitrate}
          textBitrate={this.state.textBitrate}
          videoBitrate={this.state.videoBitrate}
          estimatedBandwidth={this.state.estimatedBandwidth}
          audioBuffer={this.state.audioBuffer}
          videoBuffer={this.state.videoBuffer}
          memoryHeap={this.state.memoryHeap}
          error={this.state.error}
        />
      </>
    );
  }
}

export default Sandbox;
