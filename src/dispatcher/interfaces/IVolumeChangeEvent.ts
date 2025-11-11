import EEvent from '@dispatcher/enum/EEvent';

interface IVolumeChangeEvent {
  name: EEvent.VOLUME_CHANGE;
  muted: boolean;
  volume: number;
}

export default IVolumeChangeEvent;
