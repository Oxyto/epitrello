<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const { url } = $props();

	onMount(() => {
		if (!browser) return;

		const search = url.searchParams;
		const id = search.get('id');
		const email = search.get('email') ?? '';
		const name = search.get('name') ?? '';

		if (!id) {
			goto('/login?error=github_user');
			return;
		}

		const user = { id, email, name };

		localStorage.setItem('user', JSON.stringify(user));
		localStorage.setItem('authToken', 'github-' + Date.now());

		goto(`/u/${id}#profile`);
	});
</script>

<p class="p-4 text-slate-200">Connexion GitHub en cours...</p>
