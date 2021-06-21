import { Container } from '@produck/splitview';
import { WRAP_STYLE } from './utils';

const DIRECTION_REG = /^(row|column)$/;

/**
 * @type {import('vue').ComponentOptions}
 */
export const ContainerComponent = {
	render(createElement) {
		return createElement('div', {
			class: 'sv-vue',
			style: WRAP_STYLE,
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
			default: 'row',
			validator(value) {
				return DIRECTION_REG.test(value);
			}
		}
	},
	mounted() {
		this._container.mount(this.$el);
		this.commitDirection();
	},
	destroyed() {
		this._container.destroy();
	}
};
