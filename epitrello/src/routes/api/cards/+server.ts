import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { CardConnector, rdb, type UUID } from '$lib/server/redisConnector';
import {
	getBoardIdFromCard,
	getBoardIdFromList,
	requireBoardAccess
} from '$lib/server/boardAccess';
import { notifyBoardUpdated } from '$lib/server/boardEvents';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

async function getOrderedCardIds(listId: string): Promise<string[]> {
	const cardIds = await rdb.smembers(`list:${listId}:cards`);

	const cardsWithOrder = await Promise.all(
		cardIds.map(async (id) => {
			const rawOrder = await rdb.hget(`card:${id}`, 'order');
			const order = Number.parseInt(String(rawOrder ?? ''), 10);

			return {
				id: String(id),
				order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER
			};
		})
	);

	return cardsWithOrder.sort((a, b) => a.order - b.order).map((entry) => entry.id);
}

async function reorderCard(
	cardId: string,
	fromListId: string,
	toListId: string,
	targetIndex: number
) {
	const sourceOrdered = await getOrderedCardIds(fromListId);
	const sourceWithoutCard = sourceOrdered.filter((id) => id !== cardId);
	const destinationOrdered =
		fromListId === toListId
			? sourceWithoutCard
			: (await getOrderedCardIds(toListId)).filter((id) => id !== cardId);
	const safeIndex = clamp(targetIndex, 0, destinationOrdered.length);
	const destinationWithCard = [
		...destinationOrdered.slice(0, safeIndex),
		cardId,
		...destinationOrdered.slice(safeIndex)
	];

	if (fromListId !== toListId) {
		await rdb.srem(`list:${fromListId}:cards`, cardId);
		await rdb.sadd(`list:${toListId}:cards`, cardId);
	}

	if (fromListId === toListId) {
		await Promise.all(
			destinationWithCard.map((id, index) =>
				rdb.hset(`card:${id}`, { list: toListId, order: index })
			)
		);
		return;
	}

	await Promise.all(
		sourceWithoutCard.map((id, index) => rdb.hset(`card:${id}`, { list: fromListId, order: index }))
	);
	await Promise.all(
		destinationWithCard.map((id, index) => rdb.hset(`card:${id}`, { list: toListId, order: index }))
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const { listId, title, userId } = await request.json();

	if (!listId || !title) {
		throw error(400, 'listId and title required');
	}

	const boardId = await getBoardIdFromList(String(listId));

	if (userId) {
		if (!boardId) {
			throw error(404, 'List not found');
		}

		await requireBoardAccess(boardId as UUID, userId, 'edit');
	}

	try {
		const currentCardIds = await rdb.smembers(`list:${listId}:cards`);
		const cardId = await CardConnector.create(listId as string, title);

		await rdb.sadd(`list:${listId}:cards`, cardId);
		await rdb.hset(`card:${cardId}`, {
			list: String(listId),
			order: currentCardIds.length
		});
		if (boardId) {
			notifyBoardUpdated({ boardId, actorId: userId, source: 'card' });
		}

		return json({ id: cardId, title });
	} catch (err) {
		console.error('create card failed', err);
		throw error(500, 'create card failed');
	}
};
export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const {
		cardId,
		name,
		description,
		dueDate,
		assignees,
		fromListId,
		toListId,
		targetIndex,
		completed,
		userId
	} = body as {
		cardId?: string;
		name?: string;
		description?: string;
		dueDate?: string;
		assignees?: string[];
		fromListId?: string;
		toListId?: string;
		targetIndex?: number;
		completed?: boolean;
		userId?: string;
	};

	if (!cardId) {
		throw error(400, 'cardId required');
	}

	const boardId =
		(await getBoardIdFromCard(cardId)) ??
		(fromListId ? await getBoardIdFromList(fromListId) : null) ??
		(toListId ? await getBoardIdFromList(toListId) : null);

	if (userId) {
		if (!boardId) {
			throw error(404, 'Card not found');
		}

		await requireBoardAccess(boardId as UUID, userId, 'edit');
	}

	if (typeof name === 'string') {
		await rdb.hset(`card:${cardId}`, { name });
	}

	if (typeof description === 'string') {
		await rdb.hset(`card:${cardId}`, { description });
	}

	if (typeof dueDate === 'string') {
		await rdb.hset(`card:${cardId}`, { dueDate: dueDate.trim() });
	}

	if (Array.isArray(assignees)) {
		const normalizedAssignees = assignees
			.map((assignee) => String(assignee).trim())
			.filter((assignee) => assignee.length > 0);

		await rdb.del(`card:${cardId}:assignees`);
		await Promise.all(
			normalizedAssignees.map((assignee) => rdb.sadd(`card:${cardId}:assignees`, assignee))
		);
	}

	if (typeof completed === 'boolean') {
		await rdb.hset(`card:${cardId}`, { completed: completed ? 1 : 0 });
	}

	if (fromListId && toListId && Number.isInteger(targetIndex)) {
		await reorderCard(cardId, fromListId, toListId, Number(targetIndex));
	} else if (fromListId && toListId && fromListId !== toListId) {
		await rdb.srem(`list:${fromListId}:cards`, cardId);
		await rdb.sadd(`list:${toListId}:cards`, cardId);
		await rdb.hset(`card:${cardId}`, { list: toListId });
	}
	if (boardId) {
		notifyBoardUpdated({ boardId, actorId: userId, source: 'card' });
	}

	return json({ ok: true });
};
export const DELETE: RequestHandler = async ({ url, request }) => {
	let id = url.searchParams.get('id');
	let userId = url.searchParams.get('userId');

	if (!id) {
		try {
			const body = await request.json();
			if (body && typeof body.cardId === 'string') {
				id = body.cardId;
			}
			if (!userId && body && typeof body.userId === 'string') {
				userId = body.userId;
			}
		} catch (error) {
			void error;
		}
	}

	if (!id) {
		throw error(400, 'cardId required');
	}

	const boardId = await getBoardIdFromCard(id);

	if (userId) {
		if (!boardId) {
			throw error(404, 'Card not found');
		}

		await requireBoardAccess(boardId as UUID, userId, 'edit');
	}

	try {
		await CardConnector.del(id as UUID);
		if (boardId) {
			notifyBoardUpdated({ boardId, actorId: userId, source: 'card' });
		}
		return json({ ok: true });
	} catch (e) {
		console.error('Erreur delete card', e);
		throw error(500, 'delete card failed');
	}
};
