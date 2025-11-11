import EEvent from '../enum/EEvent';

interface IEstimatedBandwidthEvent {
  name: EEvent.ESTIMATED_BANDWIDTH;
  estimatedBandwidth: number;
}

export default IEstimatedBandwidthEvent;
