import type { UiList } from './board.types';

export async function createListApi(boardId: string, userId: string, name: string) {
	try {
		const res = await fetch('/api/lists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ boardId, name, userId })
		});
		if (!res.ok) {
			console.error('Erreur création liste', await res.text());
			return null;
		}

		return (await res.json()) as { id: string; name: string };
	} catch (err) {
		console.error('Erreur réseau /api/lists', err);
		return null;
	}
}

export async function deleteListApi(listId: string, userId: string) {
	try {
		const userParam = encodeURIComponent(userId);
		const listParam = encodeURIComponent(listId);
		const res = await fetch(`/api/lists?id=${listParam}&userId=${userParam}`, { method: 'DELETE' });
		if (!res.ok) {
			console.error('Erreur API delete list', await res.text());
		}
	} catch (err) {
		console.error('Erreur réseau delete list', err);
	}
}

export async function renameListApi(listId: string, userId: string, name: string) {
	try {
		await fetch('/api/lists', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ listId, name: name.trim(), userId })
		});
	} catch (err) {
		console.error('Erreur rename list', err);
	}
}

export async function createCardApi(listId: string, userId: string, title: string) {
	try {
		const res = await fetch('/api/cards', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ listId, title, userId })
		});
		if (!res.ok) {
			console.error('Erreur création carte', await res.text());
			return null;
		}

		return (await res.json()) as { id: string; title: string };
	} catch (err) {
		console.error('Erreur réseau /api/cards', err);
		return null;
	}
}

export async function deleteCardApi(cardId: string, userId: string) {
	try {
		const encodedCardId = encodeURIComponent(cardId);
		const encodedUserId = encodeURIComponent(userId);
		const res = await fetch(`/api/cards?id=${encodedCardId}&userId=${encodedUserId}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			console.error('Erreur API delete card', await res.text());
		}
	} catch (err) {
		console.error('Erreur réseau API delete card', err);
	}
}

export async function patchCardFieldsApi(
	cardId: string,
	userId: string,
	fields: Record<string, unknown>
) {
	try {
		await fetch('/api/cards', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cardId, userId, ...fields })
		});
	} catch (err) {
		console.error('Erreur update card fields', err);
	}
}

export async function patchCardMoveApi(
	cardId: string,
	userId: string,
	fromListId: string,
	toListId: string,
	targetIndex: number
) {
	try {
		await fetch('/api/cards', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				cardId,
				fromListId,
				toListId,
				targetIndex,
				userId
			})
		});
	} catch (err) {
		console.error('Erreur move card', err);
	}
}

export async function patchListsOrderApi(lists: UiList[], userId: string) {
	const updates = lists
		.map((list, order) => (list.uuid ? { listId: list.uuid, order } : null))
		.filter((entry): entry is { listId: string; order: number } => entry !== null);

	await Promise.all(
		updates.map(async ({ listId, order }) => {
			try {
				const res = await fetch('/api/lists', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ listId, order, userId })
				});
				if (!res.ok) {
					console.error('Erreur persist list order', listId, order, await res.text());
				}
			} catch (err) {
				console.error('Erreur persist list order', err);
			}
		})
	);
}
