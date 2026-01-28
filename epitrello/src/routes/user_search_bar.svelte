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

<div id="user-search-bar" class="flex h-16 items-center gap-4 bg-sky-600 p-4 shadow-lg">
	<a href="/u/{user.id}" class="flex flex-row items-center gap-2 select-none" draggable="false"
		><img src={EpitrelloLogo} alt="EpiTrello Logo" class="w-12" draggable="false" />
		<p class="font-mono text-xl text-white">EpiTrello</p></a
	>
	<input
		type="text"
		placeholder="Search"
		class="flex-1 rounded-md bg-gray-700 px-4 py-2 text-white focus:border-0"
	/>
	<button
		type="button"
		class="rounded-md bg-sky-400 px-4 py-2 text-white shadow transition-all hover:cursor-pointer hover:bg-white hover:text-black"
		onclick={handleCreate}>Create</button
	>
	<a
		href="#notifications"
		class="rounded-md bg-sky-500 px-4 py-2 text-white shadow transition-all hover:cursor-pointer hover:bg-white hover:text-black"
		><img src="/path/to/notification/icon.svg" alt="Notifications" /></a
	>
	<button
		type="button"
		class="rounded-md bg-sky-500 px-4 py-2 text-white shadow transition-all hover:cursor-pointer hover:bg-white hover:text-black"
		onclick={handleProfileClick}>Profile</button
	>
	<LogoutButton />
</div>
