<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UserAdminManagedUsersTable from './UserAdminManagedUsersTable.svelte';

	type UserRole = 'student' | 'ape' | 'admin';
	type ManagedUser = {
		uuid: string;
		email: string;
		username: string;
		role: UserRole;
	};
	const { currentUserId, currentSettingsUserId } = $props<{
		currentUserId: string;
		currentSettingsUserId: string;
	}>();
	let managedUsers = $state<ManagedUser[]>([]);
	let loadingManagedUsers = $state(false);
	let creatingManagedUser = $state(false);
	let updatingManagedUserId = $state('');
	let adminErrorMessage = $state('');
	let adminSuccessMessage = $state('');
	let newManagedUserEmail = $state('');
	let newManagedUserName = $state('');
	let newManagedUserRole = $state<UserRole>('student');
	let loadedForUserId = $state('');
	function normalizeRole(value: unknown): UserRole {
		return value === 'ape' || value === 'admin' ? value : 'student';
	}
	function sortManagedUsers(users: ManagedUser[]) {
		return [...users].sort((left, right) => {
			if (left.uuid === currentSettingsUserId) return -1;
			if (right.uuid === currentSettingsUserId) return 1;
			return left.username.localeCompare(right.username, undefined, { sensitivity: 'base' });
		});
	}

	function updateLocalUserRole(role: UserRole) {
		if (!browser) return;
		const rawUser = localStorage.getItem('user');
		if (!rawUser) return;
		try {
			const currentUser = JSON.parse(rawUser) as { id?: string; role?: string };
			if (currentUser.id !== currentSettingsUserId) return;

			currentUser.role = role;
			localStorage.setItem('user', JSON.stringify(currentUser));
		} catch {
			// no-op: malformed localStorage user should not break role update flow
		}
	}
	async function loadManagedUsers() {
		if (!currentUserId) return;
		loadingManagedUsers = true;
		adminErrorMessage = '';
		try {
			const response = await fetch(`/api/users?requesterId=${encodeURIComponent(currentUserId)}`);
			const payload = (await response.json().catch(() => null)) as {
				users?: Array<Partial<ManagedUser>>;
				error?: string;
			} | null;
			if (!response.ok) {
				adminErrorMessage = payload?.error ?? 'Unable to load users.';
				return;
			}
			const normalizedUsers = Array.isArray(payload?.users)
				? payload.users
						.filter(
							(user): user is Partial<ManagedUser> & { uuid: string; email: string } =>
								typeof user?.uuid === 'string' && typeof user?.email === 'string'
						)
						.map((user) => ({
							uuid: user.uuid.trim(),
							email: user.email.trim(),
							username: String(user.username ?? user.email).trim(),
							role: normalizeRole(user.role)
						}))
				: [];

			managedUsers = sortManagedUsers(normalizedUsers);
		} catch (error) {
			console.error('Erreur load users', error);
			adminErrorMessage = 'Network error while loading users.';
		} finally {
			loadingManagedUsers = false;
		}
	}
	$effect(() => {
		if (!currentUserId || currentUserId === loadedForUserId) return;
		loadedForUserId = currentUserId;
		void loadManagedUsers();
	});
	async function handleCreateManagedUser(event: SubmitEvent) {
		event.preventDefault();
		if (!currentUserId || creatingManagedUser) return;
		const email = newManagedUserEmail.trim().toLowerCase();
		const username = newManagedUserName.trim();
		adminErrorMessage = '';
		adminSuccessMessage = '';
		if (!email) {
			adminErrorMessage = 'Email is required.';
			return;
		}
		creatingManagedUser = true;
		try {
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requesterId: currentUserId,
					email,
					name: username,
					role: newManagedUserRole
				})
			});

			const payload = (await response.json().catch(() => null)) as {
				user?: ManagedUser;
				error?: string;
			} | null;
			if (!response.ok) {
				adminErrorMessage = payload?.error ?? 'Unable to create user.';
				return;
			}
			newManagedUserEmail = '';
			newManagedUserName = '';
			newManagedUserRole = 'student';
			adminSuccessMessage = `User "${payload?.user?.email ?? email}" created.`;
			await loadManagedUsers();
		} catch (error) {
			console.error('Erreur create user', error);
			adminErrorMessage = 'Network error while creating user.';
		} finally {
			creatingManagedUser = false;
		}
	}
	async function handleManagedUserRoleChange(targetUser: ManagedUser, role: UserRole) {
		if (!currentUserId || updatingManagedUserId) return;
		if (targetUser.role === role) return;
		updatingManagedUserId = targetUser.uuid;
		adminErrorMessage = '';
		adminSuccessMessage = '';
		try {
			const response = await fetch('/api/users', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: targetUser.uuid,
					requesterId: currentUserId,
					role
				})
			});
			const payload = (await response.json().catch(() => null)) as {
				role?: UserRole;
				error?: string;
			} | null;
			if (!response.ok) {
				adminErrorMessage = payload?.error ?? 'Unable to update user role.';
				return;
			}
			managedUsers = sortManagedUsers(
				managedUsers.map((user) => (user.uuid === targetUser.uuid ? { ...user, role } : user))
			);
			if (targetUser.uuid === currentSettingsUserId) {
				updateLocalUserRole(payload?.role ?? role);
			}
			adminSuccessMessage = `Updated role for "${targetUser.username}" to ${role}.`;
		} catch (error) {
			console.error('Erreur update role', error);
			adminErrorMessage = 'Network error while updating role.';
		} finally {
			updatingManagedUserId = '';
		}
	}
	async function handleDeleteManagedUser(targetUser: ManagedUser) {
		if (!currentUserId || updatingManagedUserId) return;
		const confirmed = confirm(`Delete account "${targetUser.email}"?`);
		if (!confirmed) return;
		updatingManagedUserId = targetUser.uuid;
		adminErrorMessage = '';
		adminSuccessMessage = '';
		try {
			const response = await fetch(
				`/api/users?id=${encodeURIComponent(targetUser.uuid)}&requesterId=${encodeURIComponent(currentUserId)}`,
				{ method: 'DELETE' }
			);
			const payload = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) {
				adminErrorMessage = payload?.error ?? 'Unable to delete user.';
				return;
			}
			if (targetUser.uuid === currentSettingsUserId) {
				localStorage.removeItem('authToken');
				localStorage.removeItem('user');
				goto(resolve('/login'));
				return;
			}
			managedUsers = managedUsers.filter((user) => user.uuid !== targetUser.uuid);
			adminSuccessMessage = `Deleted account "${targetUser.email}".`;
		} catch (error) {
			console.error('Erreur delete managed user', error);
			adminErrorMessage = 'Network error while deleting user.';
		} finally {
			updatingManagedUserId = '';
		}
	}
</script>

<section
	class="mt-5 rounded-xl border border-amber-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
>
	<div class="mb-4">
		<h2 class="text-lg font-semibold text-amber-200">Admin - Account Management</h2>
		<p class="mt-1 text-sm text-slate-300">
			Create users, assign roles (`student`, `ape`, `admin`) and remove accounts.
		</p>
	</div>

	<form onsubmit={handleCreateManagedUser} class="grid gap-3 md:grid-cols-4">
		<input
			type="email"
			class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
			placeholder="Email"
			bind:value={newManagedUserEmail}
			disabled={creatingManagedUser}
			required
		/>
		<input
			type="text"
			class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
			placeholder="Display name (optional)"
			bind:value={newManagedUserName}
			disabled={creatingManagedUser}
		/>
		<select
			class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
			bind:value={newManagedUserRole}
			disabled={creatingManagedUser}
		>
			<option value="student">Student</option>
			<option value="ape">APE</option>
			<option value="admin">Admin</option>
		</select>
		<button
			type="submit"
			class="cursor-pointer rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-900/50 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
			disabled={creatingManagedUser}
		>
			{creatingManagedUser ? 'Creating...' : 'Create account'}
		</button>
	</form>

	{#if adminSuccessMessage}
		<p
			class="mt-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
		>
			{adminSuccessMessage}
		</p>
	{/if}

	{#if adminErrorMessage}
		<p
			class="mt-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
		>
			{adminErrorMessage}
		</p>
	{/if}

	<UserAdminManagedUsersTable
		{loadingManagedUsers}
		{managedUsers}
		{updatingManagedUserId}
		{currentSettingsUserId}
		onManagedUserRoleChange={handleManagedUserRoleChange}
		onDeleteManagedUser={handleDeleteManagedUser}
	/>
</section>
