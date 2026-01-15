<script lang="ts">
	import EpitrelloLogo from '$lib/assets/logos/epitrello-logo.png'
	import LogoutButton from '$lib/LogoutButton.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	async function handleCreate() {
		if (!browser) return;

		const raw = localStorage.getItem('user');
		if (!raw) {
			goto('/login');
			return;
		}

		const user = JSON.parse(raw);
		const name = prompt('Nom du board ?')?.trim();
		if (!name) return;

		const res = await fetch('/api/boards', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				ownerId: user.id,
				name
			})
		});

		if (!res.ok) {
			console.error('Erreur création board', await res.text());
			return;
		}

		const board = await res.json();
		goto(`/b/${board.id}`);
	}
		function handleProfileClick() {
		if (!browser) return;

		const raw = localStorage.getItem('user');
		if (!raw) {
			goto('/login');
			return;
		}

		let user;
		try {
			user = JSON.parse(raw);
		} catch {
			goto('/login');
			return;
		}

		if (!user?.id) {
			goto('/login');
			return;
		}
		goto(`/u/${user.id}#profile`);
	}
</script>

<div id="user-search-bar" class="flex h-16 items-center gap-4 bg-sky-500 p-4 shadow-md">
	<a href="/"><img src={EpitrelloLogo} alt="EpiTrello Logo" class="w-12" /></a>
	<a href="/" class="text-white font-mono text-xl">EpiTrello</a>
	<input type="text" placeholder="Search" class="flex-1 rounded-md bg-gray-700 px-4 py-2 text-white focus:border-0" />
	<button type="button" class="rounded-md bg-sky-400 px-4 py-2 text-white hover:bg-white hover:text-black" onclick={handleCreate}>Create</button>
	<a href="#notifications" class="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-white hover:text-black"
		><img src="/path/to/notification/icon.svg" alt="Notifications" /></a
	>
	<button type="button" class="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-white hover:text-black" onclick={handleProfileClick}>Profile</button>
	<LogoutButton />
</div>
