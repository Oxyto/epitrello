<script lang="ts">
	import epitrello_logo from '$lib/assets/logos/epitrello-logo.png';
	export let login: boolean;
</script>

<div
	id="top-bar"
	class="sticky top-0 flex h-16 items-center gap-4 bg-sky-500 p-4 text-white shadow-lg shadow-gray-400"
>
	<a href="https://intra.epitech.eu/"
		><img id="epitrello-logo" src={epitrello_logo} alt="Epitrello Logo" class="w-12" /></a
	>
	<h1 id="title" class="select-none font-mono text-xl">EpiTrello</h1>
	{#if login === false}
		<a
			id="login"
			href="/login"
			class="ml-auto select-none rounded-md bg-sky-600 px-4 py-2 hover:bg-white hover:text-black">Login</a
		>
	{/if}
</div>
