<script lang="ts">
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

<div id="user-search-bar" class="flex h-16 items-center gap-4 bg-gray-800 p-4 shadow-md">
    <img src="/path/to/logo.svg" alt="EpiTrello Logo" class="text-white" />
    <a href="/" class="text-white">EpiTrello</a>
    <input type="text" placeholder="Search" class="flex-1 rounded bg-gray-700 px-4 py-2 text-white" />
    <button
        type="button"
        class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        on:click={handleCreate}
    >
        Create
    </button>
    <a href="#notifications" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        <img src="/path/to/notification/icon.svg" alt="Notifications" />
    </a>
    <button
        type="button"
        class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        on:click={handleProfileClick}
    >
        Profile
    </button>
    <LogoutButton />
</div>
