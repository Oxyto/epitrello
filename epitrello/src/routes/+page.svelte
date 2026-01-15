<script lang="ts">
	import TopBar from './top_bar.svelte';
</script>

<TopBar login={false} />
<div id="content" class="flex flex-col items-center justify-start z-0 font-['IBM Plex Sans, sans-serif']">
	<div
		id="welcome-section"
		class="flex w-screen flex-row h-[calc(100vh-7.5rem)] items-center justify-center bg-gray-100 p-48 text-center"
	>
		<h1 class="select-none text-center font-mono text-5xl font-bold">
			Welcome to EpiTrello !
		</h1>
		<img
			id="welcome-image"
			src="/illustrations/phone.png"
			alt="Welcome Illustration"
			class="mx-auto mt-6"
		/>
	</div>
	<div id="footer" class="w-full bg-sky-950 p-4 text-center text-white">
		<p>&copy; 2025 Epitrello. All rights reserved.</p>
	</div>
</div>
