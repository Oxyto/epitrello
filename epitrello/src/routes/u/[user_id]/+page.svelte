<script lang="ts">
    import LogoutButton from '$lib/LogoutButton.svelte';
    import UserSearchBar from '../../user_search_bar.svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const { data } = $props();

    let ready = $state(false);

    onMount(() => {
        if (!browser) return;

        const raw = localStorage.getItem('user');
        if (!raw) {
            goto('/login');
            return;
        }

        let currentUser: { id?: string } | null = null;
        try {
            currentUser = JSON.parse(raw);
        } catch {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            goto('/login');
            return;
        }

        if (!currentUser?.id) {
            goto('/login');
            return;
        }

        if (currentUser.id !== data.user_id) {
            goto(`/u/${currentUser.id}#profile`);
            return;
        }
        ready = true;
    });

    async function handleDeleteBoard(id: string) {
        const confirmDelete = confirm('Supprimer ce board ?');
        if (!confirmDelete) return;

        const res = await fetch(`/api/boards?id=${id}`, { method: 'DELETE' });

        if (!res.ok) {
            console.error('Erreur suppression board', await res.text());
            return;
        }

        window.location.reload();
    }
</script>
{#if ready}
    <UserSearchBar />

    <div class="p-4 text-gray-900">
        <h1 class="mb-2 text-2xl font-bold">
            User Page for ID: {data.user_id}
        </h1>

        {#if data.email}
            <p>Email : {data.email}</p>
        {/if}

        {#if data.name}
            <p>Nom : {data.name}</p>
        {/if}

        <section class="mt-6">
            <h2 class="mb-2 text-xl font-semibold">Mes boards</h2>

            {#if data.boards && data.boards.length}
                <ul class="flex flex-wrap gap-3">
                    {#each data.boards as board}
                        <li class="w-48 rounded bg-gray-800 p-3 text-white shadow">*
                            <div class="flex items-center justify-between gap-2"> 
                                <a href={`/b/${board.id}`} class="block hover:underline">
                                    {board.name}
                                </a>
                                <button
                                    type="button"
                                    class="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-500"
                                    onclick={() => handleDeleteBoard(board.id)}
                                    title="Supprimer ce board"
                                >
                                    ✕
                                </button>
                            </div>
                            <p class="mt-1 text-xs text-gray-300">
                                ID: {board.id}
                            </p>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-sm text-gray-600">
                    Aucun board pour le moment. Utilise le bouton "Create" pour en créer un.
                </p>
            {/if}
        </section>

        <section class="mt-6">
            <h2 class="mb-2 text-lg font-semibold">Debug data</h2>
            <pre class="rounded bg-gray-100 p-3 text-xs">
    {JSON.stringify(data, null, 2)}
            </pre>
        </section>
    </div>
{:else}
    <!-- Optionnel : écran blanc ou petit message -->
    <p class="p-4 text-gray-500">Redirection...</p>
{/if}