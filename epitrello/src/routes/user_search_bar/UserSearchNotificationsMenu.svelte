<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { createEventDispatcher, onMount } from 'svelte';
	import type { NotificationItem, NotificationsResponse, SessionUser } from './user-search.types';

	const NOTIFICATIONS_REFRESH_INTERVAL_MS = 45000;

	const { getCurrentUserOrRedirect, closeSignal = 0 } = $props<{
		getCurrentUserOrRedirect: () => SessionUser | null;
		closeSignal?: number;
	}>();

	const dispatch = createEventDispatcher<{ open: undefined }>();

	let menuElement = $state<HTMLElement | null>(null);
	let notificationsRefreshTimer = $state<ReturnType<typeof setInterval> | null>(null);
	let notifications = $state<NotificationItem[]>([]);
	let isNotificationsOpen = $state(false);
	let isNotificationsLoading = $state(false);
	let notificationsError = $state('');
	let isMarkingNotificationsRead = $state(false);
	let lastCloseSignal = $state(0);

	const unreadNotificationsCount = $derived(
		notifications.reduce((total, notification) => total + (notification.readAt ? 0 : 1), 0)
	);

	$effect(() => {
		if (closeSignal === lastCloseSignal) {
			return;
		}

		lastCloseSignal = closeSignal;
		closeNotificationsPanel();
	});

	function clearNotificationsRefreshTimer() {
		if (!notificationsRefreshTimer) {
			return;
		}

		clearInterval(notificationsRefreshTimer);
		notificationsRefreshTimer = null;
	}

	function closeNotificationsPanel() {
		isNotificationsOpen = false;
	}

	function formatNotificationTimestamp(value: string) {
		const timestamp = new Date(value);
		if (Number.isNaN(timestamp.getTime())) {
			return value;
		}

		return timestamp.toLocaleString();
	}

	async function fetchNotifications(options: { silent?: boolean } = {}) {
		const user = getCurrentUserOrRedirect();
		if (!user) {
			return;
		}

		const silent = options.silent ?? false;
		if (!silent) {
			isNotificationsLoading = true;
		}
		notificationsError = '';

		const params = new URLSearchParams({
			userId: user.id,
			limit: '20'
		});

		try {
			const response = await fetch(`/api/notifications?${params.toString()}`);
			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Unable to load notifications');
			}

			const payload = (await response.json()) as Partial<NotificationsResponse>;
			notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
		} catch (fetchError) {
			notifications = [];
			notificationsError =
				fetchError instanceof Error
					? fetchError.message
					: 'Unable to load notifications right now.';
		} finally {
			if (!silent) {
				isNotificationsLoading = false;
			}
		}
	}

	async function markAllNotificationsRead() {
		if (isMarkingNotificationsRead) {
			return;
		}

		const user = getCurrentUserOrRedirect();
		if (!user) {
			return;
		}

		isMarkingNotificationsRead = true;
		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: user.id })
			});
		} catch (markError) {
			console.error('Unable to mark notifications as read', markError);
		} finally {
			isMarkingNotificationsRead = false;
		}
	}

	async function toggleNotificationsPanel() {
		isNotificationsOpen = !isNotificationsOpen;
		if (!isNotificationsOpen) {
			return;
		}

		dispatch('open');
		await fetchNotifications();
		if (unreadNotificationsCount > 0) {
			await markAllNotificationsRead();
			await fetchNotifications({ silent: true });
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isNotificationsOpen) {
			event.preventDefault();
			closeNotificationsPanel();
		}
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		void fetchNotifications();
		notificationsRefreshTimer = setInterval(() => {
			void fetchNotifications({ silent: true });
		}, NOTIFICATIONS_REFRESH_INTERVAL_MS);

		const handleDocumentMousedown = (event: MouseEvent) => {
			if (!menuElement || !(event.target instanceof Node)) {
				return;
			}

			if (menuElement.contains(event.target)) {
				return;
			}

			closeNotificationsPanel();
		};

		document.addEventListener('mousedown', handleDocumentMousedown);
		return () => {
			clearNotificationsRefreshTimer();
			document.removeEventListener('mousedown', handleDocumentMousedown);
		};
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="relative" bind:this={menuElement}>
	<button
		type="button"
		class="relative cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		onclick={() => void toggleNotificationsPanel()}
		aria-expanded={isNotificationsOpen}
		aria-controls="notifications-panel"
	>
		Notifications
		{#if unreadNotificationsCount > 0}
			<span
				class="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-rose-300/45 bg-rose-500/90 px-1 text-[11px] font-bold text-rose-50"
			>
				{Math.min(unreadNotificationsCount, 99)}
			</span>
		{/if}
	</button>

	{#if isNotificationsOpen}
		<div
			id="notifications-panel"
			class="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-[min(92vw,24rem)] rounded-lg border border-sky-300/25 bg-slate-900/95 p-2 shadow-xl shadow-slate-950/70 backdrop-blur-sm"
		>
			<div class="mb-2 flex items-center justify-between gap-2">
				<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
					Notifications
				</p>
				<button
					type="button"
					class="rounded-md border border-slate-500/60 bg-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={async () => {
						await markAllNotificationsRead();
						await fetchNotifications({ silent: true });
					}}
					disabled={unreadNotificationsCount === 0 || isMarkingNotificationsRead}
				>
					Mark all read
				</button>
			</div>

			{#if isNotificationsLoading}
				<p class="px-1 py-2 text-sm text-slate-300">Loading notifications...</p>
			{:else if notificationsError}
				<p class="px-1 py-2 text-sm text-rose-200">{notificationsError}</p>
			{:else if notifications.length === 0}
				<p class="px-1 py-2 text-sm text-slate-300">No notifications yet.</p>
			{:else}
				<ul class="max-h-80 space-y-2 overflow-y-auto pr-1">
					{#each notifications as notification (notification.id)}
						<li
							class={`rounded-md border px-2 py-2 ${
								notification.readAt
									? 'border-slate-600/50 bg-slate-800/50'
									: 'border-sky-300/35 bg-sky-500/10'
							}`}
						>
							<p class="truncate text-sm font-semibold text-slate-100">{notification.title}</p>
							<p class="mt-1 text-xs text-slate-300">{notification.message}</p>
							<div class="mt-2 flex items-center justify-between gap-2">
								<span class="text-[11px] text-slate-400">
									{formatNotificationTimestamp(notification.createdAt)}
								</span>
								{#if notification.boardId}
									<a
										href={resolve(`/b/${notification.boardId}`)}
										class="rounded-md border border-slate-500/50 bg-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-slate-600"
									>
										Open
									</a>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
