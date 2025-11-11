import './Subtitles.css';

import React from 'react';

import {ICue} from '../..';

type IProps = {
  cues: Array<ICue>;
};
type IState = Record<string, never>;

class Subtitles extends React.Component<IProps, IState> {
  render(): JSX.Element {
    return (
      <div className="subtitles">
        {this.props.cues.map((cue: ICue, index: number): JSX.Element => {
          const {text, region} = cue;
          let css: React.CSSProperties = {
            color: 'white'
          };
          if (region && region.style) {
            const {backgroundColor, color, fontFamily, fontSize, textAlign} = region.style;
            css = {
              backgroundColor,
              color: color,
              fontFamily,
              fontSize,
              textAlign: textAlign as typeof css.textAlign
            };
          }

          return (
            <span key={index} style={css}>
              {text}
            </span>
          );
        })}
      </div>
    );
  }
}

export default Subtitles;
