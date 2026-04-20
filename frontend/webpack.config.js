const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv = {}) => {
  const isProd = argv.mode === 'production' || process.env.NODE_ENV === 'production';
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    entry: path.resolve(__dirname, 'index.web.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      alias: {
        'react-native$': 'react-native-web',
      },
      extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules[\\/](?!react-native-safe-area-context[\\/])/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { esmodules: true }, modules: false }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
              plugins: ['react-native-web'],
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif|svg|ttf|otf)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.REACT_APP_API_URL': JSON.stringify(apiBase),
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'web/index.html'),
      }),
      new CopyWebpackPlugin({
        patterns: [
          // So fetch('/fonts/...') and fetch('/bleiche-logo-text.png') resolve in prod builds.
          { from: path.resolve(__dirname, 'web/fonts'), to: 'fonts' },
          { from: path.resolve(__dirname, 'web/assets'), to: '.' },
        ],
      }),
    ],
    devServer: {
      port: 3000,
      hot: true,
      open: true,
      static: {
        directory: path.resolve(__dirname, 'web'),
      },
      historyApiFallback: true,
    },
    performance: {
      hints: isProd ? 'warning' : false,
      maxEntrypointSize: 1_500_000,
      maxAssetSize: 1_500_000,
    },
  };
};
