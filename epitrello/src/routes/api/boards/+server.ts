import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { rdb } from '$lib/server/redisConnector';
import type { UUID } from 'crypto';
import { UserConnector, BoardConnector } from '$lib/server/redisConnector';
import { requireBoardAccess } from '$lib/server/boardAccess';
import { notifyBoardUpdated } from '$lib/server/boardEvents';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	if (!body || !body.ownerId || !body.name) {
		return json({ error: 'ownerId et name sont requis' }, { status: 400 });
	}

	const ownerId = body.ownerId as UUID;
	const name = String(body.name).trim();

	if (!name) {
		return json({ error: 'Le nom du board ne peut pas être vide' }, { status: 400 });
	}

	const user = await UserConnector.get(ownerId);
	if (!user) {
		return json({ error: 'Utilisateur introuvable' }, { status: 404 });
	}

	const uuid = await BoardConnector.create(ownerId, name);
	const board = await BoardConnector.get(uuid as UUID);
	const createdBoardName = board?.name ?? name;

	notifyBoardUpdated({
		boardId: String(uuid),
		actorId: ownerId,
		source: 'board',
		history: {
			action: 'board.created',
			message: `Created board "${createdBoardName}".`,
			metadata: { name: createdBoardName }
		}
	});

	if (!board) {
		return json(
			{
				uuid,
				name,
				owner: ownerId
			},
			{ status: 201 }
		);
	}

	return json(
		{
			uuid: board.uuid,
			name: board.name,
			owner: board.owner
		},
		{ status: 201 }
	);
};
export const PATCH: RequestHandler = async ({ request }) => {
	const { boardId, name, userId } = await request.json();
	const normalizedName = typeof name === 'string' ? name.trim() : '';

	if (!boardId || !normalizedName) {
		throw error(400, 'boardId and name required');
	}

	await requireBoardAccess(boardId as UUID, userId, 'owner', {
		allowLegacyWithoutUserId: true
	});

	await rdb.hset(`board:${boardId}`, { name: normalizedName });
	notifyBoardUpdated({
		boardId: String(boardId),
		actorId: userId,
		source: 'board',
		history: {
			action: 'board.renamed',
			message: `Renamed board to "${normalizedName}".`,
			metadata: { name: normalizedName }
		}
	});

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	const userId = url.searchParams.get('userId');

	if (!id) {
		return json({ error: 'Paramètre id manquant' }, { status: 400 });
	}

	await requireBoardAccess(id as UUID, userId, 'owner', {
		allowLegacyWithoutUserId: true
	});

	await BoardConnector.del(id as UUID);

	return json({ ok: true });
};
