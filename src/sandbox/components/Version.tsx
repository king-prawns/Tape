import './Version.css';

import React from 'react';

import pkg from '../../../package.json';

type IProps = Record<string, never>;
type IState = Record<string, never>;
class Version extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
  }

  render(): JSX.Element {
    return <span className="version">v{pkg.version}</span>;
  }
}

export default Version;
