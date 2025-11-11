import EEvent from '../enum/EEvent';

interface ICdnChangeEvent {
  name: EEvent.CDN_CHANGE;
  cdn: string;
}

export default ICdnChangeEvent;
