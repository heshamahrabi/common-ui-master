module.exports = {
  devServer: {
    disableHostCheck: true,
    port: 8201,
    public: '0.0.0.0:8201'
  },
  publicPath: "/",
  "transpileDependencies": [
    "vuetify"
  ],
  configureWebpack: {
    output: {
      libraryExport: 'default'
    }
  }
}
