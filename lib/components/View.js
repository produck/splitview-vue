import { WRAP_STYLE } from './utils';

function isNotNaN(value) {
	return !isNaN(Number(value));
}

/**
 * @type {import('vue').ComponentOptions}
 */
export const ViewComponent = {
	render(createElement) {
		return createElement('div', {
			style: WRAP_STYLE,
		}, this.$slots.default);
	},
	computed: {
		viewOptions() {
			return {
				min: Number(this.min),
				max: Number(this.max)
			};
		}
	},
	watch: {
		value(size) {
			if (!this._view.container.resizing) {
				this.setSize(Number(size));
			}
		}
	},
	methods: {
		setSize(value) {
			if (typeof value !== 'number') {
				throw new Error('A view size MUST be a number.');
			}

			const freeSize = this._view.setSize(value);

			this.$emit('input', this._view.size);

			return freeSize;
		}
	},
	mounted() {
		const view = this.$parent._container.createView(this.viewOptions);

		view.element.addEventListener('view-size-change', () => {
			this.$emit('input', view.size);
			this.$emit('resize', view);
		});

		this._view = view;
		this._view.element.appendChild(this.$el);
		this.$parent._container.appendView(this._view);

		if (this.init !== null) {
			this.$nextTick(() => this.setSize(Number(this.init)));
		}
	},
	destroyed() {
		this.$parent._container.removeView(this._view);
	},
	beforeCreate() {
		if (this.$parent.$options.name !== 'sv-container') {
			throw new Error('A `sv-view` parent MUST be a `sv-container`.');
		}
	},
	props: {
		min: {
			type: [Number, String],
			default: 50,
			validator: isNotNaN
		},
		max: {
			type: [Number, String],
			default: window.screen.width * 4,
			validator: isNotNaN
		},
		init: {
			type: [Number, String, null],
			default: null,
			validator: isNotNaN
		},
		value: {
			type: [Number, String],
			default: 50
		}
	}
};
