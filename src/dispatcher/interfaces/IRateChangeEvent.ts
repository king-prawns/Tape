import EEvent from '../enum/EEvent';

interface IRateChangeEvent {
  name: EEvent.RATE_CHANGE;
  playbackRate: number;
}

export default IRateChangeEvent;
