import { Container } from '@produck/splitview';

/**
 * @type {import('vue').ComponentOptions}
 */
export const ContainerComponent = {
	render(createElement) {
		return createElement('div', {
			class: 'sv-vue',
			style: { width: '100%', height: '100%' },
		}, this.$slots.default);
	},
	name: 'sv-container',
	computed: {
		container() {
			return this._container;
		}
	},
	beforeCreate() {
		const container = this._container = Container();

		container.element.addEventListener('container-size-change', event => {
			event.stopPropagation();
			this.$emit('resize', container);
		});

		container.element.addEventListener('request-reset', event => {
			event.stopPropagation();
			this.$emit('reset', container);
		});
	},
	watch: {
		direction() {
			this.commitDirection();
		}
	},
	methods: {
		commitDirection() {
			this._container.direction = this.direction;
		}
	},
	props: {
		direction: {
			type: String,
			default: 'row'
		}
	},
	mounted() {
		this._container.mount(this.$el);
		this.commitDirection();
	}
};
