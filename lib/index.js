// import ContainerComponent from './components/Container.vue';
// import ViewComponent from './components/View.vue';
import { ContainerComponent } from './components/Container';
import { ViewComponent } from './components/View';

export default {
	/**
	 * @param {import('vue').VueConstructor} Vue
	 */
	install(Vue) {
		Vue.component('sv-container', ContainerComponent);
		Vue.component('sv-view', ViewComponent);
	}
};
