<script lang="ts">
	import UserSearchBar from '../../../user_search_bar.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const { data } = $props<{
		data: {
			user_id: string;
			email: string;
			name: string;
		};
	}>();

	const DISPLAY_NAME_MAX_LENGTH = 80;
	let ready = $state(false);
	let currentUserId = $state('');
	let displayName = $state('');
	let saving = $state(false);
	let deleting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	onMount(() => {
		if (!browser) return;

		const rawUser = localStorage.getItem('user');
		if (!rawUser) {
			goto('/login');
			return;
		}

		let currentUser: { id?: string; name?: string } | null = null;
		try {
			currentUser = JSON.parse(rawUser);
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

		currentUserId = currentUser.id;
		if (currentUserId !== data.user_id) {
			goto(`/u/${currentUserId}/settings`);
			return;
		}

		const initialDisplayName =
			data.name?.trim() || currentUser.name?.trim() || data.email.split('@')[0];
		displayName = initialDisplayName;

		ready = true;
	});

	function updateLocalUserName(nextName: string) {
		if (!browser) return;

		const rawUser = localStorage.getItem('user');
		if (!rawUser) return;

		try {
			const currentUser = JSON.parse(rawUser) as { id?: string; name?: string };
			if (currentUser.id !== data.user_id) return;

			currentUser.name = nextName;
			localStorage.setItem('user', JSON.stringify(currentUser));
		} catch {
			// no-op: malformed localStorage user should not break settings save flow
		}
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const trimmedName = displayName.trim();
		errorMessage = '';
		successMessage = '';

		if (!trimmedName) {
			errorMessage = 'Display name cannot be empty.';
			return;
		}

		saving = true;
		try {
			const response = await fetch('/api/users', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: data.user_id,
					requesterId: currentUserId,
					displayName: trimmedName
				})
			});

			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean;
				name?: string;
				error?: string;
			} | null;
			if (!response.ok) {
				errorMessage = payload?.error ?? 'Unable to update profile settings.';
				return;
			}

			displayName = String(payload?.name ?? trimmedName);
			updateLocalUserName(displayName);
			successMessage = 'Profile updated.';
		} catch (err) {
			console.error('Erreur update profile', err);
			errorMessage = 'Network error, please try again.';
		} finally {
			saving = false;
		}
	}

	async function handleDeleteAccount() {
		if (!currentUserId || deleting) return;

		const confirmed = confirm(
			`Permanently delete account "${data.email}"? All owned boards will also be deleted.`
		);
		if (!confirmed) return;

		const validation = prompt('Type DELETE to confirm account removal.');
		if (validation?.trim().toUpperCase() !== 'DELETE') {
			errorMessage = 'Deletion canceled.';
			return;
		}

		deleting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch(
				`/api/users?id=${encodeURIComponent(data.user_id)}&requesterId=${encodeURIComponent(currentUserId)}`,
				{ method: 'DELETE' }
			);
			const payload = (await response.json().catch(() => null)) as { error?: string } | null;

			if (!response.ok) {
				errorMessage = payload?.error ?? 'Account deletion failed.';
				return;
			}

			localStorage.removeItem('authToken');
			localStorage.removeItem('user');
			goto('/login');
		} catch (err) {
			console.error('Erreur delete account', err);
			errorMessage = 'Network error while deleting account.';
		} finally {
			deleting = false;
		}
	}
</script>

{#if ready}
	<UserSearchBar />

	<main
		class="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-6 text-slate-100 sm:px-8 lg:px-12"
	>
		<section
			class="rounded-xl border border-sky-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">
						User Settings
					</p>
					<h1 class="mt-1 text-2xl font-bold">User Settings</h1>
					<p class="mt-1 text-sm text-slate-300">Manage your profile and account preferences.</p>
				</div>
				<a
					href={`/u/${data.user_id}#profile`}
					class="rounded-md border border-sky-300/25 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700/90"
				>
					Back to profile
				</a>
			</div>

			<form onsubmit={handleSave} class="grid gap-4">
				<div class="grid gap-1.5">
					<label for="display-name" class="text-sm font-semibold text-slate-200">Display name</label
					>
					<input
						id="display-name"
						type="text"
						maxlength={DISPLAY_NAME_MAX_LENGTH}
						bind:value={displayName}
						class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Your display name..."
					/>
				</div>

				<div class="grid gap-1.5">
					<label for="email" class="text-sm font-semibold text-slate-200">Email</label>
					<input
						id="email"
						type="text"
						value={data.email}
						readonly
						class="rounded-md border border-slate-700/70 bg-slate-900/85 px-3 py-2 text-slate-300"
					/>
				</div>

				<button
					type="submit"
					disabled={saving}
					class="w-fit cursor-pointer rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/50 transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</form>

			{#if successMessage}
				<p
					class="mt-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
				>
					{successMessage}
				</p>
			{/if}

			{#if errorMessage}
				<p
					class="mt-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
				>
					{errorMessage}
				</p>
			{/if}
		</section>

		<section
			class="mt-5 rounded-xl border border-rose-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<h2 class="text-lg font-semibold text-rose-200">Danger zone</h2>
			<p class="mt-1 text-sm text-slate-300">
				Delete your account and all boards you own. This action is irreversible.
			</p>
			<button
				type="button"
				class="mt-4 cursor-pointer rounded-md border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={deleting}
				onclick={handleDeleteAccount}
			>
				{deleting ? 'Deleting...' : 'Delete account'}
			</button>
		</section>
	</main>
{:else}
	<p class="p-4 text-slate-300">Loading...</p>
{/if}
