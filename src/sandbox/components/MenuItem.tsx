import './MenuItem.css';

import React from 'react';

type IProps = {
  value: number | string;
  current: number | string;
  focus: boolean;
  onMenuItemClick: (value: number | string) => void;
};
type IState = Record<string, never>;

class MenuItem extends React.Component<IProps, IState> {
  static defaultProps = {
    focus: false
  };

  private isSelected(): boolean {
    return this.props.value === this.props.current;
  }

  private onClick = (): void => {
    this.props.onMenuItemClick(this.props.value);
  };

  render(): JSX.Element {
    return (
      <div
        className={'menu-item ' + (this.isSelected() ? 'selected ' : '') + (this.props.focus ? 'focus' : '')}
        onClick={this.onClick}
      >
        {this.props.value}
      </div>
    );
  }
}

export default MenuItem;
