import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import router from './router'

Vue.config.productionTip = false
//if no js file name occurs then it will look for index.js - which it will find here
require('./components');

new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
