import Container from './src/Container.vue';
import View from './src/View.vue';

export default {
	/**
	 * @param {import('vue').VueConstructor} Vue
	 */
	install(Vue) {
		Vue.component('sv-container', Container);
		Vue.component('sv-view', View);
	}
};
