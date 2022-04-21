const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
// obfuscator
const WebpackObfuscator = require('webpack-obfuscator');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new WebpackObfuscator({ rotateStringArray: true }, [])
  ],
  optimization: {
    chunkIds: "total-size",
    mangleExports: true,
    mergeDuplicateChunks: true,
    removeEmptyChunks: true,
    minimize: true,
  },
  devServer: {
    contentBase: 'dist'
  }
});