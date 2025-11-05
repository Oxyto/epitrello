<script lang="ts">
    export let login: boolean;
</script>

<div id="top-bar" class="flex items-center gap-4 bg-gray-800 p-4 text-white shadow-lg shadow-gray-400 sticky top-0 h-16">
	<img id="epitrello-logo" src="/logos/epitrello-logo.png" alt="Epitrello Logo" />
	<h1 id="title" class="select-none">EpiTrello</h1>
    {#if login === false}
	<a
		id="login"
		href="/login"
		class="ml-auto select-none rounded bg-blue-600 px-4 py-2 hover:bg-blue-700">Login</a
	>
    {/if}
</div>
