import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { ListConnector, rdb, type UUID } from '$lib/server/redisConnector';

export const POST: RequestHandler = async ({ request }) => {
	const { boardId, name } = await request.json();

	if (!boardId || !name) {
		throw error(400, 'boardId and name required');
	}

	try {
		const listId = await ListConnector.create(boardId as UUID, name);
		await rdb.sadd(`board:${boardId}:lists`, listId);

		return json({ id: listId, name });
	} catch (err) {
		console.error('create list failed', err);
		throw error(500, 'create list failed');
	}
};
export const PATCH: RequestHandler = async ({ request }) => {
	const { listId, name } = await request.json();

	if (!listId || !name) {
		throw error(400, 'listId and name required');
	}

	await rdb.hset(`list:${listId}`, { name });

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		throw error(400, 'id required');
	}

	try {
		await ListConnector.del(id as UUID);
		return json({ ok: true });
	} catch (err) {
		console.error('delete list failed', err);
		throw error(500, 'delete list failed');
	}
};
