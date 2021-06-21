/*!
 * splitview-vue v0.1.0
 * (c) 2020-2021 ChaosLee
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['splitview-vue'] = factory());
}(this, (function () { 'use strict';

	const MAX_WIDTH = window.screen.width * 4;

	function normalizeViewOptions(_options) {
		const options = {
			min: 50,
			max: MAX_WIDTH
		};

		const {
			min: _min = options.min,
			max: _max = options.max,
		} = _options;

		if (_min < 0 || !isFinite(_min)) {
			throw new Error('A min MUST be >= 0 and finity.');
		}

		if (_max < _min) {
			throw new Error('A max MUST >= the min and finity.');
		}

		options.min = _min;
		options.max = _max;

		return options;
	}

	const FIXED_CONTAINER_STYLE = {
		'display': 'block',
		'top': '0',
		'left': '0',
		'position': 'relative',
		'width': '100%',
		'height': '100%',
		'overflow': 'hidden',
		'border': 'none',
		'padding': '0',
		'margin': '0'
	};

	const FIXED_VIEW_OUTER_STYLE = {
		'display': 'block',
		'position': 'absolute',
		'overflow': 'hidden'
	};

	const FIXED_HANDLER_CONTAINER_STYLE = {
		'display': 'block',
		'overflow': 'visible',
		'top': '0',
		'left': '0',
		'position': 'absolute',
		'z-index': '1'
	};

	const FIXED_HANDLER_STYLE = {
		'display': 'block',
		'position': 'absolute',
		'transition-property': 'background-color',
		'transition-duration': '0.2s',
		'transition-delay': '0.1s',
		'user-select': 'none'
	};

	const
		WIN = window,
		DOC = document,
		MATH = Math,
		RESIZING = 9,
		FIX_OFFSET = 8,
		CONTAINER = 7;

	function createDivElement() {
		return DOC.createElement('div');
	}

	function setClassName(element, value) {
		element.className = value;
	}

	function addEventListener(element, eventType, listener) {
		element.addEventListener(eventType, listener);
	}

	function removeEventListener(element, eventType, listener) {
		element.removeEventListener(eventType, listener);
	}

	function SplitviewEvent(type, data) {
		const event = new Event(type, { bubbles: true });

		event.data = data;

		return event;
	}

	function getMedian(min, max, target) {
		return MATH.max(MATH.min(target, max), min);
	}

	/**
	 * @param {HTMLDivElement} element
	 */
	function setStyle(element, style) {
		for (const property in style) {
			element.style.setProperty(property, style[property], 'important');
		}
	}

	function setContainerStyle(element) {
		setStyle(element, FIXED_CONTAINER_STYLE);
	}

	function setViewOuterStyle(element) {
		setStyle(element, FIXED_VIEW_OUTER_STYLE);
	}

	function setHandlerContainerStyle(element) {
		setStyle(element, FIXED_HANDLER_CONTAINER_STYLE);
	}

	function setHandlerStyle(element) {
		setStyle(element, FIXED_HANDLER_STYLE);
	}

	const AXIS_MAP = {
		row: {
			p: 'clientX', // position
			cSS: 'height', // cross-style-size
			cSO: 'top', // cross-style-offset
			sS: 'width', // style-size
			sO: 'left', // style-offset
			oS: 'offsetWidth', // offset-size
			o: 'offsetLeft', // offset
			sCV: 'col-resize' // style-cursor-value
		},
		column: {
			p: 'clientY',
			cSS: 'width',
			cSO: 'left',
			sS: 'height',
			sO: 'top',
			oS: 'offsetHeight',
			o: 'offsetTop',
			sCV: 'row-resize'
		},
	};

	const NEXT = 1, PREV = 0;

	const GET_SIZE = ctx => ctx._size;
	const GET_MIN = ctx => ctx.min;
	const HANDLER_SIZE = 4;


	function SUM(ctx, which, getter) {
		let sum = 0;

		ctx.each(which, sibling => sum += getter(sibling));

		return sum;
	}

	const Config = {
		[NEXT]: function ConfigNext(ctx) {
			const viewCtx = ctx[PREV];

			return {
				direction: NEXT,
				pulled: viewCtx,
				limit: { pull: viewCtx.max, push: SUM(viewCtx, NEXT, GET_MIN) },
				origin: { pull: viewCtx.size, push: SUM(viewCtx, NEXT, GET_SIZE) }
			};
		},
		[PREV]: function ConfigPrev(ctx) {
			const viewCtx = ctx;

			return {
				direction: PREV,
				pulled: viewCtx,
				limit: { pull: viewCtx.max, push: SUM(viewCtx, PREV, GET_MIN) },
				origin: { pull: viewCtx.size, push: SUM(viewCtx, PREV, GET_SIZE) }
			};
		}
	};

	function computeDistance(a, b) {
		return MATH.trunc(MATH.abs(a - b));
	}

	function EndpointView(containerCtx) {
		const protoView = SplitviewView({ max: 0, min: 0 }, containerCtx);
		const endpointViewCtx = new Object(protoView);

		endpointViewCtx.view = null;

		return endpointViewCtx;
	}

	function SplitviewView(options, containerCtx) {
		const handlerElement = createDivElement();
		const viewElement = createDivElement();

		setClassName(viewElement, 'sv-view');
		setClassName(handlerElement, 'sv-handler');
		setViewOuterStyle(viewElement);
		setHandlerStyle(handlerElement);

		function updateViewState(deltaSize, config) {
			const { limit, origin, pulled, direction } = config;

			pulled.size = MATH.min(
				limit.pull, // !pullable
				origin.pull + origin.push - limit.push, // !pushable
				origin.pull + deltaSize // General
			);

			let freeDelta = pulled.size - origin.pull;

			/**
			 * The pulled & all pushed views MUST be all fixed.
			 * Because number of view changing size a time may be less than last time.
			 * So use `forEach` not `find`. No need for more optimization.
			 */
			pulled.each(direction, ctx => {
				const delta = ctx._size - freeDelta > ctx.min
					? freeDelta : ctx._size - ctx.min;

				ctx.size = ctx._size - delta;
				freeDelta -= delta;
			});
		}

		function startResize(event) {
			const { axis } = containerCtx;
			const initPos = event[axis.p];

			setStyle(DOC.body, { 'cursor': axis.sCV });
			ctx[RESIZING] = containerCtx[RESIZING] = true;
			containerCtx.snapshot();

			const configMap = {
				[NEXT]: Config[NEXT](ctx),
				[PREV]: Config[PREV](ctx)
			};

			function updateViewStateWhenMoving(event) {
				const delta = event[axis.p] - initPos;

				/**
				 * - There will be a smaller probability that pointer position moving back
				 *   to the original. Just only `return` means no size adjustment this time
				 *   and may cause all sizes of views keeping at a previous state.
				 *
				 * - Restoring sizes of all views every time, avoids creating a dirty state
				 *   when `which` is reversed causing sizes of last views not be restored.
				 */
				containerCtx.restore();

				if (delta !== 0) {
					updateViewState(MATH.abs(delta), configMap[delta > 0 ? NEXT : PREV]);
				}
			}

			addEventListener(WIN, 'mousemove', updateViewStateWhenMoving);
			addEventListener(WIN, 'mouseup', function endResize() {
				removeEventListener(WIN, 'mousemove', updateViewStateWhenMoving);
				removeEventListener(WIN, 'mouseup', endResize);
				ctx[RESIZING] = containerCtx[RESIZING] = false;
				updateStyle();
			});
		}

		let hover = false;

		function updateStyle() {
			const resizing = ctx[RESIZING] && containerCtx[RESIZING];
			const ready = hover && !containerCtx[RESIZING];
			const highlight = resizing || ready;

			setStyle(handlerElement, { 'background-color': highlight ? '#007fd4': null });
			setStyle(DOC.body, { 'cursor': highlight ? containerCtx.axis.sCV : 'default' });
		}

		function dispatchRequestAdjustment() {
			handlerElement.dispatchEvent(SplitviewEvent('request-reset', ctx.view));
		}

		addEventListener(handlerElement, 'mouseover', () => hover = true);
		addEventListener(handlerElement, 'mouseout', () => hover = false);
		addEventListener(handlerElement, 'mousedown', startResize);
		addEventListener(handlerElement, 'mouseover', updateStyle);
		addEventListener(handlerElement, 'mouseout', updateStyle);
		addEventListener(handlerElement, 'dblclick', dispatchRequestAdjustment);

		const ctx = {
			[RESIZING]: false,
			_size: 0,
			[PREV]: null,
			[NEXT]: null,
			get min() { return options.min; },
			get max() { return options.max; },
			get resizable() { return options.max !== options.min; },
			get eView() { return viewElement; },
			get eHandler() { return handlerElement; },
			get size() { return viewElement[containerCtx.axis.oS] + 0.01; },
			get o() { return viewElement[containerCtx.axis.o]; },
			set size(value) {
				value = MATH.trunc(value);

				if (ctx.size !== value) {
					setStyle(viewElement, { [containerCtx.axis.sS]: `${value}px` });
					ctx.each(NEXT, sibling => sibling[FIX_OFFSET]());
					viewElement.dispatchEvent(SplitviewEvent('view-size-change', ctx.view));
				}
			},
			each(which, callback) {
				let sibling = ctx[which];

				while (sibling !== null && sibling[which] !== null) {
					callback(sibling);
					sibling = sibling[which];
				}
			},
			[FIX_OFFSET]() {
				const { axis } = containerCtx;
				const offset = MATH.trunc(ctx[PREV].o + ctx[PREV].size);

				setStyle(viewElement, {
					[axis.sO]: `${offset}px`
				});

				setStyle(handlerElement, {
					[axis.sO]: `${offset - HANDLER_SIZE / 2}px `
				});
			},
			relayout() {
				const { axis } = containerCtx;

				setStyle(viewElement, {
					[axis.cSS]: '100%',
					[axis.cSO]: '0'
				});

				setStyle(handlerElement, {
					[axis.cSS]: '100%',
					[axis.cSO]: '0',
					[axis.sS]: `${HANDLER_SIZE}px`,
					['display']: ctx[PREV].resizable ? 'block' : 'none'
				});

				ctx.size = ctx.min;
			},
			view: Object.seal({
				get container() { return containerCtx[CONTAINER]; },
				get element() { return viewElement; },
				get previousSibling() { return ctx[PREV].view; },
				get nextSibling() { return ctx[NEXT].view; },
				get size() { return MATH.trunc(ctx.size); },
				setSize(value) {
					if (typeof value !== 'number') {
						throw new Error('A view size MUST be a number.');
					}

					const finalValue = getMedian(ctx.min, ctx.max, value);

					/**
					 * Not to set view.size if resizing.
					 */
					if (!containerCtx[RESIZING]) {
						if (computeDistance(finalValue, ctx.size) === 0) return 0;

						containerCtx.snapshot();

						const delta = finalValue - ctx.size;
						const deltaSize = MATH.abs(delta);

						updateViewState(deltaSize, Config[delta > 0 ? NEXT : PREV](ctx[NEXT]));

						if (computeDistance(finalValue, ctx.size) !== 0) {
							const delta = finalValue - ctx.size;
							const deltaSize = MATH.abs(delta);

							updateViewState(deltaSize, Config[delta > 0 ? PREV : NEXT](ctx));
						}
					}

					return computeDistance(finalValue, ctx.size);
				}
			})
		};

		return ctx;
	}

	const HEAD = 0, REAR = 1;

	function SplitviewContainer() {
		const containerElement = createDivElement();
		const handlerContainerElement = createDivElement();

		setClassName(containerElement, 'sv-container');
		setClassName(handlerContainerElement, 'sv-handler-container');
		setContainerStyle(containerElement);
		setHandlerContainerStyle(handlerContainerElement);
		containerElement.appendChild(handlerContainerElement);

		let debouncer = null;

		function autoAdjustment() {
			clearTimeout(debouncer);

			const viewCtxList = [];

			ctx[HEAD].each(NEXT, viewCtx => viewCtxList.push(viewCtx));

			viewCtxList.sort((viewCtxA, viewCtxB) => {
				return (viewCtxA.max - viewCtxA.min) - (viewCtxB.max - viewCtxB.min);
			});

			const finalFreeSize = viewCtxList.reduce((freeSize, viewCtx, index) => {
				const totalSize = viewCtxList.slice(index).reduce((sum, view) => sum + view.size, 0);
				const targetSize = MATH.round(viewCtx.size / totalSize * freeSize);
				const size = getMedian(viewCtx.min, viewCtx.max, targetSize);

				viewCtx.size = size;

				return freeSize - size;
			}, containerElement[ctx.axis.oS]);

			ctx[HEAD].each(NEXT, viewCtx => viewCtx[FIX_OFFSET]());

			if (finalFreeSize !== 0) {
				debouncer = setTimeout(() => console.warn(`Splitview: free ${finalFreeSize}px`), 1000);
			}
		}

		let observer = null;

		function observeContainerSize() {
			let lastWidth = containerElement.offsetWidth;
			let lastHeight = containerElement.offsetHeight;

			(function observe() {
				const width = containerElement.offsetWidth;
				const height = containerElement.offsetHeight;

				if (lastWidth !== width || lastHeight !== height) {
					autoAdjustment();
					containerElement.dispatchEvent(SplitviewEvent('container-size-change', ctx[CONTAINER]));
				}

				lastWidth = width;
				lastHeight = height;
				observer = WIN.requestAnimationFrame(observe);
			}());
		}

		function cancelObserveConatinerSize() {
			cancelAnimationFrame(observer);
		}

		function relayout() {
			if (containerElement.parentElement !== null) {
				setStyle(handlerContainerElement, {
					[ctx.axis.cSS]: '100%',
					[ctx.axis.sS]: '0'
				});

				ctx[HEAD].each(NEXT, view => view.relayout());
				autoAdjustment();
			}
		}

		function appendViewCtx(viewCtx) {
			ctx[REAR][PREV][NEXT] = viewCtx;
			viewCtx[PREV] = ctx[REAR][PREV];
			viewCtx[NEXT] = ctx[REAR];
			ctx[REAR][PREV] = viewCtx;
			containerElement.appendChild(viewCtx.eView);
			handlerContainerElement.appendChild(viewCtx.eHandler);
		}

		function removeViewCtx(viewCtx) {
			viewCtx[PREV][NEXT] = viewCtx[NEXT];
			viewCtx[NEXT][PREV] = viewCtx[PREV];
			viewCtx[NEXT] = viewCtx[PREV] = null;
			containerElement.removeChild(viewCtx.eView);
			handlerContainerElement.removeChild(viewCtx.eHandler);
		}

		function assertOwned(view) {
			if (view.container !== ctx[CONTAINER]) {
				throw new Error('The view does NOT belongs to this container.');
			}
		}

		const viewWeakMap = new WeakMap();

		const ctx = {
			[RESIZING]: false,
			axis: AXIS_MAP.row,
			direction: 'row',
			[HEAD]: null,
			[REAR]: null,
			snapshot() {
				ctx[HEAD].each(NEXT, ctx => ctx._size = ctx.size);
			},
			restore() {
				ctx[HEAD].each(NEXT, ctx => ctx.size = ctx._size);
			},
			[CONTAINER]: Object.seal({
				/**
				 * @param {HTMLElement} element
				 */
				get resizing() { return ctx[RESIZING]; },
				set direction(value) {
					if (value !== 'row' && value !== 'column') {
						throw new Error('A direction MUST be `row` or `column`.');
					}

					if (value === ctx.direction) {
						return;
					}

					ctx.direction = value;
					ctx.axis = AXIS_MAP[value];
					relayout();
				},
				get direction() { return ctx.direction; },
				get element() { return containerElement; },
				get firstView() { return ctx[HEAD][NEXT].view; },
				get lastView() { return ctx[REAR][PREV].view; },
				get viewList() {
					const list = [];

					ctx[HEAD].each(NEXT, viewCtx => list.push(viewCtx.view));

					return list;
				},
				mount(element) {
					element.appendChild(containerElement);
					relayout();
					observeContainerSize();
				},
				destroy() {
					containerElement.parentElement.removeChild(containerElement);
					cancelObserveConatinerSize();
				},
				relayout,
				appendView(view) {
					assertOwned(view);
					appendViewCtx(viewWeakMap.get(view));
					relayout();

					return view;
				},
				removeView(view) {
					assertOwned(view);

					const viewCtx = viewWeakMap.get(view);

					if (viewCtx === undefined) {
						throw new Error('The view is NOT in container.');
					}

					removeViewCtx(viewCtx);
					relayout();

					return view;
				},
				insertBefore(newView, referenceView = null) {
					assertOwned(newView);

					if (referenceView === null) {
						appendViewCtx(viewWeakMap.get(referenceView));
					} else {
						if (referenceView.container !== ctx[CONTAINER]) {
							throw new Error('The reference view does NOT belongs to this container.');
						}

						if (newView.previousSibling !== null) {
							removeViewCtx(viewWeakMap.get(newView));
						}

						const newViewCtx = viewWeakMap.get(newView);
						const referenceViewCtx = viewWeakMap.get(referenceView);

						newViewCtx[NEXT] = referenceViewCtx;
						newViewCtx[PREV] = referenceViewCtx[PREV];
						referenceViewCtx[PREV][NEXT] = newViewCtx;
						referenceViewCtx[PREV] = newViewCtx;

						containerElement.insertBefore(newViewCtx.eView, referenceViewCtx.eView);
						handlerContainerElement.insertBefore(newViewCtx.eHandler, referenceViewCtx.eHandler);
					}

					relayout();

					return newView;
				},
				createView(options = {}) {
					if (typeof options !== 'object') {
						throw new Error('An options MUST be an object.');
					}

					const viewCtx = SplitviewView(normalizeViewOptions(options), ctx);

					viewWeakMap.set(viewCtx.view, viewCtx);

					return viewCtx.view;
				}
			})
		};

		ctx[HEAD] = EndpointView(ctx);
		ctx[REAR] = EndpointView(ctx);
		ctx[HEAD][NEXT] = ctx[REAR];
		ctx[REAR][PREV] = ctx[HEAD];

		return ctx[CONTAINER];
	}

	const WRAP_STYLE = { width: '100%', height: '100%' };

	const DIRECTION_REG = /^(row|column)$/;

	/**
	 * @type {import('vue').ComponentOptions}
	 */
	const ContainerComponent = {
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
			const container = this._container = SplitviewContainer();

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

	function isNotNaN(value) {
		return !isNaN(Number(value));
	}

	/**
	 * @type {import('vue').ComponentOptions}
	 */
	const ViewComponent = {
		name: 'sv-view',
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
			},
			isCollapsible() {
				return typeof this.collapsible === 'boolean'
					? this.collapsible
					: typeof this.collapsible === 'string';
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
			collapsible: {
				type: [Boolean, String],
				default: false
			},
			value: {
				type: [Number, String],
				default: 50
			}
		}
	};

	// import ContainerComponent from './components/Container.vue';

	var index = {
		/**
		 * @param {import('vue').VueConstructor} Vue
		 */
		install(Vue) {
			Vue.component('sv-container', ContainerComponent);
			Vue.component('sv-view', ViewComponent);
		}
	};

	return index;

})));
