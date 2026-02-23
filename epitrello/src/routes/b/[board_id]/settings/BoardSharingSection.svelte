<script lang="ts">
	import { browser } from '$app/environment';

	type ShareMember = {
		userId: string;
		role: 'owner' | 'editor' | 'viewer';
		username: string;
		email: string;
	};

	const { boardId, currentUserId } = $props<{
		boardId: string;
		currentUserId: string;
	}>();

	let sharingError = $state('');
	let sharingSuccess = $state('');
	let sharingLoading = $state(false);
	let shareLink = $state('');
	let defaultPermission = $state<'viewer' | 'editor'>('viewer');
	let members = $state<ShareMember[]>([]);
	let loadedKey = $state('');

	async function loadSharingSettings() {
		if (!browser || !boardId || !currentUserId) return;

		sharingLoading = true;
		sharingError = '';

		try {
			const res = await fetch(
				`/api/board-sharing?boardId=${encodeURIComponent(boardId)}&requesterId=${encodeURIComponent(currentUserId)}`
			);
			if (!res.ok) {
				sharingError = 'Unable to load sharing settings.';
				return;
			}

			const payload = (await res.json()) as {
				sharePath: string;
				defaultRole: 'viewer' | 'editor';
				members: ShareMember[];
			};
			shareLink = `${window.location.origin}${payload.sharePath}`;
			defaultPermission = payload.defaultRole;
			members = payload.members;
		} catch (err) {
			console.error('Erreur load sharing settings', err);
			sharingError = 'Network error while loading sharing settings.';
		} finally {
			sharingLoading = false;
		}
	}

	$effect(() => {
		if (!browser || !boardId || !currentUserId) return;

		const nextKey = `${boardId}:${currentUserId}`;
		if (nextKey === loadedKey) return;

		loadedKey = nextKey;
		void loadSharingSettings();
	});

	async function copyShareLink() {
		if (!shareLink) return;

		sharingError = '';
		sharingSuccess = '';
		try {
			await navigator.clipboard.writeText(shareLink);
			sharingSuccess = 'Share link copied.';
		} catch (err) {
			console.error('Erreur clipboard', err);
			sharingError = 'Unable to copy share link.';
		}
	}

	async function handleDefaultPermissionChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		const nextRole = target.value === 'editor' ? 'editor' : 'viewer';
		defaultPermission = nextRole;
		sharingError = '';
		sharingSuccess = '';

		try {
			const response = await fetch('/api/board-sharing', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					boardId,
					requesterId: currentUserId,
					defaultRole: nextRole
				})
			});

			if (!response.ok) {
				sharingError = 'Unable to update default permission.';
				return;
			}

			sharingSuccess = 'Default permission updated.';
		} catch (err) {
			console.error('Erreur update default permission', err);
			sharingError = 'Network error while updating default permission.';
		}
	}

	async function updateMemberRole(memberUserId: string, role: 'viewer' | 'editor' | 'remove') {
		sharingError = '';
		sharingSuccess = '';

		try {
			const response = await fetch('/api/board-sharing', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					boardId,
					requesterId: currentUserId,
					memberUserId,
					memberRole: role
				})
			});

			if (!response.ok) {
				sharingError = 'Unable to update member permissions.';
				return;
			}

			await loadSharingSettings();
			sharingSuccess = 'Member permissions updated.';
		} catch (err) {
			console.error('Erreur update member role', err);
			sharingError = 'Network error while updating member permissions.';
		}
	}
</script>

<section
	class="mt-5 select-none rounded-xl border border-sky-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
>
	<h2 class="text-lg font-semibold">Sharing</h2>
	<p class="mt-1 text-sm text-slate-300">
		Share this link so users can join with the default permission below.
	</p>

	<div class="mt-4 grid gap-2">
		<label for="share-link" class="text-sm font-semibold text-slate-200">Invite link</label>
		<div class="flex flex-wrap gap-2">
			<input
				id="share-link"
				type="text"
				class="min-w-0 flex-1 rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-sm text-slate-100"
				value={shareLink}
				readonly
			/>
			<button
				type="button"
				class="hover:cursor-pointer rounded-md border border-sky-300/30 bg-sky-700/80 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600/90"
				onclick={copyShareLink}
			>
				Copy
			</button>
		</div>
	</div>

	<div class="mt-4 grid gap-2">
		<label for="default-role" class="text-sm font-semibold text-slate-200">
			Default permission for new users
		</label>
		<select
			id="default-role"
			class="hover:cursor-pointer w-fit rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-sm text-slate-100"
			value={defaultPermission}
			onchange={handleDefaultPermissionChange}
		>
			<option value="viewer">Reader</option>
			<option value="editor">Editor</option>
		</select>
	</div>

	<div class="mt-4">
		<h3 class="text-sm font-semibold text-slate-200">Members</h3>
		{#if sharingLoading}
			<p class="mt-2 text-sm text-slate-300">Loading members...</p>
		{:else if members.length}
			<ul class="select-text mt-3 grid gap-2">
				{#each members as member (member.userId)}
					<li
						class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm"
					>
						<div class="min-w-0">
							<p class="truncate font-semibold text-slate-100">
								{member.username || member.email || member.userId}
							</p>
							<p class="truncate text-xs text-slate-400">{member.email || member.userId}</p>
						</div>
						{#if member.role === 'owner'}
							<span
								class="select-none rounded-md border border-sky-300/30 bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-100"
							>
								Owner
							</span>
						{:else}
							<div class="flex items-center gap-2">
								<select
									class="rounded-md border border-slate-600/70 bg-slate-700/80 px-2 py-1 text-xs text-slate-100"
									value={member.role}
									onchange={(event) =>
										updateMemberRole(
											member.userId,
											(event.currentTarget as HTMLSelectElement).value as 'viewer' | 'editor'
										)}
								>
									<option value="viewer">Reader</option>
									<option value="editor">Editor</option>
								</select>
								<button
									type="button"
									class="rounded-md border border-rose-300/30 bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/35"
									onclick={() => updateMemberRole(member.userId, 'remove')}
								>
									Remove
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-slate-300">No shared members yet.</p>
		{/if}
	</div>

	{#if sharingSuccess}
		<p
			class="mt-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
		>
			{sharingSuccess}
		</p>
	{/if}

	{#if sharingError}
		<p
			class="mt-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
		>
			{sharingError}
		</p>
	{/if}
</section>
