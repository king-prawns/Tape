import './Controls.css';

import React from 'react';

import {EManifestType, EPlayerState, ISeekableRange} from '../..';
import AudioTracks from './AudioTracks';
import Destroy from './icons/Destroy';
import EnterFullscreen from './icons/EnterFullscreen';
import EnterPictureInPicture from './icons/EnterPictureInPicture';
import ExitFullscreen from './icons/ExitFullscreen';
import ExitPictureInPicture from './icons/ExitPictureInPicture';
import Pause from './icons/Pause';
import Play from './icons/Play';
import SkipBackward from './icons/SkipBackward';
import SkipForward from './icons/SkipForward';
import LiveEdge from './LiveEdge';
import PlaybackRate from './PlaybackRate';
import TextTracks from './TextTracks';
import VideoTracks from './VideoTracks';
import Volume from './Volume';

type IProps = {
  manifestType: EManifestType;
  playerState: EPlayerState;
  currentTime: number;
  seekableRange: ISeekableRange;
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
  onMute: () => void;
  onUnmute: () => void;
  onVolume: (volume: number) => void;
  onPause: () => void;
  onPlay: () => void;
  onPlaybackRate: (rate: number) => void;
  onSeek: (time: number) => void;
  onSeekToLiveEdge: () => void;
  onVideoTrack: (quality: number | null) => void;
  onAudioTrack: (lang: string) => void;
  onTextTrack: (lang: string | null) => void;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  onRequestPictureInPicture: () => void;
  onLeavePictureInPicture: () => void;
  onDestroy: () => void;
};
type IState = Record<string, never>;

class Controls extends React.Component<IProps, IState> {
  private onEnterExitPictureInPicture = (): void => {
    if (this.props.pictureInPicture) {
      this.props.onLeavePictureInPicture();
    } else {
      this.props.onRequestPictureInPicture();
    }
  };

  private onEnterExitFullscreen = (): void => {
    if (this.props.fullscreen) {
      this.props.onExitFullscreen();
    } else {
      this.props.onEnterFullscreen();
    }
  };

  private onPlayPause = (): void => {
    if ([EPlayerState.LOADING, EPlayerState.PAUSED, EPlayerState.ENDED].includes(this.props.playerState)) {
      this.props.onPlay();
    } else {
      this.props.onPause();
    }
  };

  render(): JSX.Element {
    return (
      <div className="controls">
        <Volume
          muted={this.props.muted}
          volume={this.props.volume}
          onMute={this.props.onMute}
          onUnmute={this.props.onUnmute}
          onVolume={this.props.onVolume}
        />
        {this.props.manifestType === EManifestType.DYNAMIC && (
          <LiveEdge
            currentTime={this.props.currentTime}
            seekableRange={this.props.seekableRange}
            onSeekToLiveEdge={this.props.onSeekToLiveEdge}
          />
        )}
        <button onClick={(): void => this.props.onSeek(-30)} title="skip backward">
          <SkipBackward />
        </button>
        <button onClick={this.onPlayPause} title="play/pause">
          {[EPlayerState.LOADING, EPlayerState.PAUSED, EPlayerState.ENDED].includes(
            this.props.playerState
          ) ? (
            <Play />
          ) : (
            <Pause />
          )}
        </button>
        <button onClick={(): void => this.props.onSeek(30)} title="skip forward">
          <SkipForward />
        </button>
        <PlaybackRate playbackRate={this.props.playbackRate} onPlaybackRate={this.props.onPlaybackRate} />
        <VideoTracks
          videoTrack={this.props.videoTrack}
          videoTracks={this.props.videoTracks}
          onVideoTrack={this.props.onVideoTrack}
        />
        <AudioTracks
          audioTrack={this.props.audioTrack}
          audioTracks={this.props.audioTracks}
          onAudioTrack={this.props.onAudioTrack}
        />
        <TextTracks
          textTrack={this.props.textTrack}
          textTracks={this.props.textTracks}
          onTextTrack={this.props.onTextTrack}
        />
        <button onClick={this.onEnterExitPictureInPicture} title="enter/exit pip">
          {this.props.pictureInPicture ? <ExitPictureInPicture /> : <EnterPictureInPicture />}
        </button>
        <button onClick={this.onEnterExitFullscreen} title="enter/exit fullscreen">
          {this.props.fullscreen ? <ExitFullscreen /> : <EnterFullscreen />}
        </button>
        <button onClick={this.props.onDestroy} title="destroy">
          <Destroy />
        </button>
      </div>
    );
  }
}

export default Controls;
