import './Assets.css';

import React from 'react';

import {EKeySystem} from '../..';
import assets from '../assets/assets';
import IAsset from '../assets/interfaces/IAsset';

type IProps = {
  currentAsset: IAsset | null;
  onAssetChange: (value: IAsset) => void;
};
type IState = Record<string, never>;

class Assets extends React.Component<IProps, IState> {
  private isSelected(name: string): boolean {
    return name === this.props.currentAsset?.name;
  }

  private getProtection(keySystem: EKeySystem): string {
    switch (keySystem) {
      case EKeySystem.PLAYREADY:
        return 'Playready';
      case EKeySystem.WIDEVINE:
        return 'Widevine';
    }
  }

  render(): JSX.Element {
    return (
      <div className="assets">
        {assets.map((asset: IAsset, index: number) => (
          <div
            key={index}
            className={'asset ' + (this.isSelected(asset.name) ? 'selected ' : '')}
            onClick={(): void => this.props.onAssetChange(asset)}
          >
            <span>{asset.name}</span>
            <span>{asset.protocol}</span>
            {asset.eme?.keySystem && <span>{this.getProtection(asset.eme?.keySystem)}</span>}
          </div>
        ))}
      </div>
    );
  }
}

export default Assets;
