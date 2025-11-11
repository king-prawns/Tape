import {EKeySystem} from '../..';
import IAsset from './interfaces/IAsset';

const assets: Array<IAsset> = [
  {
    name: 'multi-lang',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-lang.ism/.mpd',
    protocol: 'DASH'
  },
  {
    name: 'ttml',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-ttml.ism/.mpd',
    protocol: 'DASH'
  },
  {
    name: 'wvtt',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-wvtt.ism/.mpd',
    protocol: 'DASH'
  },
  {
    name: 'multi-codec',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-codec.ism/.mpd',
    protocol: 'DASH'
  },
  {
    name: 'dash-widevine',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-dash-widevine.ism/.mpd',
    protocol: 'DASH',
    eme: {
      keySystem: EKeySystem.WIDEVINE,
      videoRobustness: ['SW_SECURE_CRYPTO'],
      audioRobustness: ['SW_SECURE_CRYPTO'],
      licenceServer: 'https://cwip-shaka-proxy.appspot.com/no_auth'
    }
  },
  {
    name: 'dash-playready',
    manifestUrl:
      'https://amssamples.streaming.mediaservices.windows.net/622b189f-ec39-43f2-93a2-201ac4e31ce1/BigBuckBunny.ism/manifest(format=mpd-time-csf).mpd',
    protocol: 'DASH',
    eme: {
      keySystem: EKeySystem.PLAYREADY,
      licenceServer:
        'https://amssamples.keydelivery.mediaservices.windows.net/Playready/?KID=1ab45440-532c-4399-94dc-5c5ad9584bac'
    }
  },
  {
    name: 'mp4',
    manifestUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4/.mpd',
    protocol: 'DASH'
  }
];

export default assets;
