<script lang="ts">
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

    <div class="ml-64 mr-64 my-16 text-gray-900 bg-gray-200 rounded-md p-4 items-center">
            <h2 class="mb-2 text-xl font-mono font-bold select-none">Mes boards</h2>
            {#if data.boards && data.boards.length}
                <ul class="flex flex-wrap gap-3">
                    {#each data.boards as board}
                        <li class="w-48 rounded-md bg-sky-600 p-3 text-white shadow shadow-gray-400">
                            <div class="flex items-center justify-between gap-2"> 
                                <a href={`/b/${board.id}`} class="block hover:underline text-lg font-mono">
                                    {board.name}
                                </a>
                                <button
                                    type="button"
                                    class="rounded-md hover:cursor-pointer hover:text-red-500 transition-all w-8 h-8"
                                    onclick={() => handleDeleteBoard(board.id)}
                                    title="Supprimer ce board"
                                >
                                    X
                                </button>
                            </div>
                            <p class="mt-1 text-xs text-gray-300">
                                #{board.id}
                            </p>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-sm font-mono text-gray-600">
                    Aucun board pour le moment. Utilise le bouton "Create" pour en créer un.
                </p>
            {/if}
    </div>
{:else}
    <!-- Optionnel : écran blanc ou petit message -->
    <p class="p-4 text-gray-500">Redirection...</p>
{/if}
