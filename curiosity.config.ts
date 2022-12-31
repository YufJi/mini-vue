import path from 'path';
import { IConfig } from 'curiosity-bundler';

export default (env): IConfig => {
  const publicPath = '/';

  return {
    entry: {
      index: path.join(__dirname, 'demo/index.js'),
    },
    html: {
      index: {
        title: 'vue源码调试',
        template: path.join(__dirname, 'index.html'),
      },
    },
    outputPath: path.join(__dirname, 'dist'),
    publicPath,
    alias: {
      '@': path.resolve(__dirname, 'src'),
      compiler: path.resolve(__dirname, 'src/compiler'),
      core: path.resolve(__dirname, 'src/core'),
      shared: path.resolve(__dirname, 'src/shared'),
    },
    urlLoaderIncludes: [
      /\.svg$/,
    ],
    webpack(config) {
      config.stats = 'minimal';

      config.resolveLoader.modules.push(path.resolve(__dirname, 'loaders'));

      config.module.rules.push({
        test: /\.wxml$/,
        loader: 'wxml-loader',
      }, {
        test: /\.wxs$/,
        loader: 'babel-loader',
      });
    },
    devServer: {
      port: 8088,
    },
    analyzer: false,
    define: {

    },
    disableCompress: false,
  };
};
