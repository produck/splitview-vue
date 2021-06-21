<template>

<sv-container
	id="app-workbench"
	class="flex-grow-1 position-relative"
>
	<sv-view
		min="48"
		max="48"
		id="app-feature-button-group"
	>
	</sv-view>

	<sv-view
		min="0"
		max="300"
		init="300"
		id="app-feature-panel"
		v-model="panelSize"
	></sv-view>

	<sv-view id="app-desktop">
		<sv-container
			direction="column"
		>
			<sv-view id="app-desktop-main">
				<input v-model.lazy="panelSize" />
			</sv-view>

			<sv-view
				id="app-desktop-console"
				min="100"
				max="400"
				init="250"
				collapsible
			></sv-view>
		</sv-container>
	</sv-view>
</sv-container>

</template>

<script>
export default {
	name: 'App',
	data() {
		return {
			panelSize: 200
		};
	}
};
</script>

<style>
* {
	margin: 0;
	padding: 0;
}

html, body {
	height: 100%;
	width: 100%;
}

.sv-view {
	box-shadow: 0 0 0 1px inset #000;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}
</style>
