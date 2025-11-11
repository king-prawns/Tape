import './Menu.css';

import React from 'react';

type IProps = {
  open: boolean;
  children: React.ReactNode;
};
type IState = Record<string, never>;

class Menu extends React.Component<IProps, IState> {
  render(): JSX.Element {
    return <div className={'menu ' + (this.props.open ? 'open' : 'close')}>{this.props.children}</div>;
  }
}

export default Menu;
