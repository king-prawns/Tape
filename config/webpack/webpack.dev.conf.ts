import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import {Configuration, ProvidePlugin} from 'webpack';
import {merge} from 'webpack-merge';

import baseConfig from './webpack.base.conf';

const devConfig: Configuration = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    filename: 'tape.js',
    publicPath: '/'
  },
  entry: [
    'webpack/hot/dev-server.js',
    'webpack-dev-server/client/index.js?live-reload=true',
    './src/sandbox/index.tsx'
  ],
  resolve: {
    fallback: {
      process: require.resolve('process/browser', {
        paths: ['src/sandbox']
      })
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: 'src/sandbox/favicon.ico',
      template: 'src/sandbox/index.html'
    }),
    new ProvidePlugin({
      process: 'process'
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, '../typescript/tsconfig.json')
        }
      }
    ]
  }
});

export default devConfig;
