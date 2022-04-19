module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-curiosity', {
        env: {
          loose: true,
        },
      }],
    ],
    plugins: [

    ],
  };
};
