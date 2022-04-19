import path from 'path';
import { IConfig } from 'curiosity-bundler';

export default (env): IConfig => {
  const publicPath = '/';

  return {
    entry: {
      index: path.join(__dirname, 'src/index.js'),
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
      compiler: path.resolve(__dirname, 'src/compiler'),
      core: path.resolve(__dirname, 'src/core'),
      shared: path.resolve(__dirname, 'src/shared'),
      web: path.resolve(__dirname, 'src/web'),
      sfc: path.resolve(__dirname, 'src/sfc'),
    },
    urlLoaderIncludes: [
      /\.svg$/,
    ],
    webpack(config) {
      config.stats = 'minimal';
    },
    devServer: {
      port: 8080,
      static: [
        path.join(__dirname, 'public'),
      ],
    },
    analyzer: false,
    define: {

    },
    disableCompress: false,
  };
};
