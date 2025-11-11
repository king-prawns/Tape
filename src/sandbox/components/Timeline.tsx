import './Timeline.css';

import React from 'react';

type IProps = {
  currentTime: number;
  seekableRange: {start: number; end: number};
  buffer: Array<Array<number>>;
  onSeek: (time: number) => void;
};
type IState = Record<string, never>;

class Timeline extends React.Component<IProps, IState> {
  private _ref: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  private onClick = (
    event: React.MouseEvent<HTMLDivElement>,
    {start, end}: {start: number; end: number}
  ): void => {
    const x: number = event.nativeEvent.offsetX;
    const barWidth: number | undefined = this._ref.current?.clientWidth;
    let time: number = 0;
    if (barWidth) {
      time = (x * (end - start)) / barWidth;
    }

    this.props.onSeek(time + start);
  };

  private digitsToString = (n: number): string => {
    if (n < 10) {
      return `0${n}`;
    } else {
      return `${n}`;
    }
  };

  private getFormattedTime = (time: number): string => {
    const currentTime: number = Math.floor(time);
    const hours: string = this.digitsToString(Math.floor(currentTime / 3600));
    const hoursRemainder: number = currentTime % 3600;
    const minutes: string = this.digitsToString(Math.floor(hoursRemainder / 60));
    const seconds: string = this.digitsToString(hoursRemainder % 60);

    return `${hours}:${minutes}:${seconds}`;
  };

  private secondsToPixel = (time: number, {start, end}: {start: number; end: number}): number => {
    const barWidth: number | undefined = this._ref.current?.clientWidth;

    let pixel: number = 0;
    if (end && barWidth) {
      pixel = (barWidth * (time - start)) / (end - start);
    }

    if (pixel < 0) {
      pixel = 0;
    }

    return pixel;
  };

  render(): JSX.Element {
    return (
      <div className="timeline">
        <div>{this.getFormattedTime(this.props.seekableRange.start)}</div>
        <div className="time">{this.getFormattedTime(this.props.currentTime)}</div>
        <div className="bar">
          <div
            className="progress"
            ref={this._ref}
            onClick={(e: React.MouseEvent<HTMLDivElement>): void => this.onClick(e, this.props.seekableRange)}
          >
            <div
              className="current-time"
              style={{
                width: this.secondsToPixel(this.props.currentTime, this.props.seekableRange)
              }}
            ></div>
            {this.props.buffer.map((range: Array<number>, index: number) => (
              <div
                key={index}
                className="buffer"
                style={{
                  left: this.secondsToPixel(range[0], this.props.seekableRange),
                  width:
                    this.secondsToPixel(range[1], this.props.seekableRange) -
                    this.secondsToPixel(range[0], this.props.seekableRange)
                }}
              ></div>
            ))}
          </div>
        </div>
        <div>{this.getFormattedTime(this.props.seekableRange.end)}</div>
      </div>
    );
  }
}

export default Timeline;
