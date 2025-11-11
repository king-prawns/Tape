import EEvent from '../enum/EEvent';

interface IActivePeriodChangeEvent {
  name: EEvent.ACTIVE_PERIOD_CHANGE;
  id: string;
}

export default IActivePeriodChangeEvent;
