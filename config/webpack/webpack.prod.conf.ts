import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import {Configuration} from 'webpack';
import {merge} from 'webpack-merge';

import base from './webpack.base.conf';

const prodConfig: Configuration = merge(base, {
  entry: './src/index.ts',
  mode: 'production',
  devtool: 'source-map',
  target: ['web', 'es5'],
  output: {
    clean: true,
    path: path.resolve(__dirname, '../../dist'),
    libraryTarget: 'commonjs',
    filename: 'tape.js'
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true
      })
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, '../typescript/tsconfig.prod.json'),
          compiler: 'ttypescript'
        }
      }
    ]
  }
});

export default prodConfig;
