import EEvent from '@dispatcher/enum/EEvent';

interface IFullscreenChangeEvent {
  name: EEvent.FULLSCREEN_CHANGE;
  fullscreen: boolean;
}

export default IFullscreenChangeEvent;
