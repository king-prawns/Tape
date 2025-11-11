import EEvent from '@dispatcher/enum/EEvent';
import ISeekableRange from '@timeline/interfaces/ISeekableRange';

interface ISeekableRangeChangeEvent {
  name: EEvent.SEEKABLE_RANGE_CHANGE;
  seekableRange: ISeekableRange;
}

export default ISeekableRangeChangeEvent;
