// vue.config.js
module.exports = {
  devServer: {
    port: 8080,
    client: {
      webSocketURL: "auto://0.0.0.0:0/ws",
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: false,
      },
    },
  },
  outputDir: "dist",
  assetsDir: "static",
  lintOnSave: false,
};
