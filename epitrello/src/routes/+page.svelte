<script lang="ts">
	import '../app.css';
	import TopBar from './top_bar.svelte';
	import Monitor from '$lib/assets/illustrations/monitor.png'
</script>

<TopBar login={false} />
<div id="content" class="items-center justify-start z-0">
	<div
		id="welcome-section"
		class="flex w-screen flex-row h-[calc(100vh-7.5rem)] overflow-hidden items-center justify-center bg-gray-100 text-center"
	>
		<h1 class="select-none text-center font-mono text-5xl font-bold z-1 w-[50%]">
			Welcome to EpiTrello !
		</h1>
		<img
			id="welcome-image"
			src={Monitor}
			alt="Welcome Illustration"
			class="z-0 w-[60%]"
		/>
	</div>
	<div id="footer" class="sticky overflow-visible bottom-0 z-20 w-full bg-sky-950 p-4 text-center text-white select-none">
		<p>&copy; 2025 Epitrello. All rights reserved.</p>
	</div>
</div>
