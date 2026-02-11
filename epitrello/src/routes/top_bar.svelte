<script lang="ts">
	import epitrello_logo from '$lib/assets/logos/epitrello-logo.png';
	export let login: boolean;
</script>

<div
	id="top-bar"
	class="sticky top-0 flex h-16 items-center gap-4 bg-sky-600 p-4 text-white shadow-lg"
>
	<a href="/" class="flex flex-row items-center hover:cursor-pointer">
		<img id="epitrello-logo" src={epitrello_logo} alt="Epitrello Logo" class="w-12" />
		<h1 id="title" class="font-mono text-xl select-none ml-2">EpiTrello</h1>
	</a>
	{#if login === false}
		<a
			id="login"
			href="/login"
			class="ml-auto rounded-md bg-sky-500 px-4 py-2 shadow transition-all select-none hover:bg-white hover:text-black"
			>Login</a
		>
	{/if}
</div>
