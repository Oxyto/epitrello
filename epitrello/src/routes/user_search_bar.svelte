<script lang="ts">
	import EpitrelloLogo from '$lib/assets/logos/epitrello-logo.png';
	import LogoutButton from '$lib/LogoutButton.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	export const user = JSON.parse(localStorage.getItem('user') ?? '');

	async function handleCreate() {
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
			alert('Erreur lors de la création du board');
			return;
		}

		const body = await res.json();
		console.log('Board créé par /api/boards :', body);

		const uuid = body.uuid;
		if (!uuid) {
			alert('La réponse du serveur ne contient pas uuid : ' + JSON.stringify(body, null, 2));
			return;
		}

		// ICI : redirection vers le board
		goto(`/b/${uuid}`);
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

<div
	id="user-search-bar"
	class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sky-300/20 bg-slate-900/85 p-4 shadow-lg shadow-slate-950/50 backdrop-blur-sm"
>
	<a href="/u/{user.id}" class="flex flex-row items-center gap-2 select-none" draggable="false"
		><img src={EpitrelloLogo} alt="EpiTrello Logo" class="w-12" draggable="false" />
		<p class="text-xl font-semibold tracking-wide text-slate-100">EpiTrello</p></a
	>
	<input
		type="text"
		placeholder="Search"
		class="flex-1 rounded-md border border-slate-600/60 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 shadow-sm shadow-slate-950/40 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
	/>
	<button
		type="button"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-600/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-500 hover:shadow-md hover:shadow-sky-900/70"
		onclick={handleCreate}>Create</button
	>
	<a
		href="#notifications"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		><img src="/path/to/notification/icon.svg" alt="Notifications" /></a
	>
	<button
		type="button"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		onclick={handleProfileClick}>Profile</button
	>
	<LogoutButton />
</div>
