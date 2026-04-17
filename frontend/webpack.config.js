const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.web.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
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
        // Keep node_modules out of Babel on all OS path styles.
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
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
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
};
