<script lang="ts">
	type UserRole = 'student' | 'ape' | 'admin';
	type ManagedUser = {
		uuid: string;
		email: string;
		username: string;
		role: UserRole;
	};

	const {
		loadingManagedUsers,
		managedUsers,
		updatingManagedUserId,
		currentSettingsUserId,
		onManagedUserRoleChange,
		onDeleteManagedUser
	} = $props<{
		loadingManagedUsers: boolean;
		managedUsers: ManagedUser[];
		updatingManagedUserId: string;
		currentSettingsUserId: string;
		onManagedUserRoleChange: (targetUser: ManagedUser, role: UserRole) => void;
		onDeleteManagedUser: (targetUser: ManagedUser) => void;
	}>();
</script>

<div class="mt-5 overflow-x-auto">
	<table class="min-w-full divide-y divide-slate-700 text-sm">
		<thead>
			<tr class="text-left text-slate-300">
				<th class="px-2 py-2 font-semibold">User</th>
				<th class="px-2 py-2 font-semibold">Email</th>
				<th class="px-2 py-2 font-semibold">Role</th>
				<th class="px-2 py-2 font-semibold">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-800/80">
			{#if loadingManagedUsers}
				<tr>
					<td class="px-2 py-3 text-slate-300" colspan="4">Loading users...</td>
				</tr>
			{:else if managedUsers.length === 0}
				<tr>
					<td class="px-2 py-3 text-slate-300" colspan="4">No users found.</td>
				</tr>
			{:else}
				{#each managedUsers as user (user.uuid)}
					<tr>
						<td class="px-2 py-3 text-slate-100">
							{user.username}
							{#if user.uuid === currentSettingsUserId}
								<span class="ml-2 rounded-md bg-slate-700/90 px-2 py-0.5 text-xs text-slate-300">You</span>
							{/if}
						</td>
						<td class="px-2 py-3 text-slate-300">{user.email}</td>
						<td class="px-2 py-3">
							<select
								class="rounded-md border border-slate-600/70 bg-slate-800/80 px-2 py-1 text-slate-100 focus:border-amber-400 focus:outline-none"
								value={user.role}
								disabled={updatingManagedUserId === user.uuid}
								onchange={(event) =>
									onManagedUserRoleChange(
										user,
										(event.currentTarget as HTMLSelectElement).value as UserRole
									)}
							>
								<option value="student">student</option>
								<option value="ape">ape</option>
								<option value="admin">admin</option>
							</select>
						</td>
						<td class="px-2 py-3">
							<button
								type="button"
								class="cursor-pointer rounded-md border border-rose-300/40 bg-rose-500/20 px-3 py-1.5 font-semibold text-rose-100 transition-colors hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={updatingManagedUserId === user.uuid}
								onclick={() => onDeleteManagedUser(user)}
							>
								{updatingManagedUserId === user.uuid ? 'Working...' : 'Delete'}
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
