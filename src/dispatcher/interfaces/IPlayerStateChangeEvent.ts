import EPlayerState from '@state/enum/EPlayerState';

import EEvent from '../enum/EEvent';

interface IPlayerStateChangeEvent {
  name: EEvent.PLAYER_STATE_CHANGE;
  playerState: EPlayerState;
}

export default IPlayerStateChangeEvent;
