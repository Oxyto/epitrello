import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { rdb } from '$lib/server/redisConnector';
import type { UUID } from 'crypto';
import { UserConnector, BoardConnector } from '$lib/server/redisConnector';
import { requireBoardAccess } from '$lib/server/boardAccess';
import { notifyBoardUpdated } from '$lib/server/boardEvents';

const MAX_SEARCH_QUERY_LENGTH = 120;
const MAX_SEARCH_LIMIT = 20;
const DEFAULT_SEARCH_LIMIT = 8;

function normalizeText(value: string | null) {
	return typeof value === 'string' ? value.trim() : '';
}

function parseSearchLimit(value: string | null) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_SEARCH_LIMIT;
	}

	return Math.min(MAX_SEARCH_LIMIT, Math.max(1, parsed));
}

function boardMatchesSearch(boardName: string, boardId: string, ownerName: string, query: string) {
	if (!query) {
		return true;
	}

	const normalizedName = boardName.toLowerCase();
	const normalizedId = boardId.toLowerCase();
	const normalizedOwnerName = ownerName.toLowerCase();
	return (
		normalizedName.includes(query) ||
		normalizedId.includes(query) ||
		normalizedOwnerName.includes(query)
	);
}

function compareBoardsByName<T extends { name: string }>(left: T, right: T) {
	return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

export const GET: RequestHandler = async ({ url }) => {
	const userId = normalizeText(url.searchParams.get('userId'));
	if (!userId) {
		return json({ error: 'userId is required' }, { status: 400 });
	}

	const query = normalizeText(url.searchParams.get('q'));
	if (query.length > MAX_SEARCH_QUERY_LENGTH) {
		return json(
			{ error: `q cannot exceed ${MAX_SEARCH_QUERY_LENGTH} characters` },
			{ status: 400 }
		);
	}

	const user = await UserConnector.get(userId as UUID);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const normalizedQuery = query.toLowerCase();
	const searchLimit = parseSearchLimit(url.searchParams.get('limit'));
	const [ownedBoards, sharedBoards] = await Promise.all([
		BoardConnector.getAllByOwnerId(userId as UUID),
		BoardConnector.getAllSharedByUserId(userId as UUID)
	]);

	const ownerDisplayName = user.username?.trim() || user.email?.trim() || 'You';

	const normalizedOwnedBoards = (ownedBoards ?? [])
		.filter((board) => board.owner === userId)
		.filter((board) =>
			boardMatchesSearch(board.name, board.uuid, ownerDisplayName, normalizedQuery)
		)
		.sort(compareBoardsByName)
		.slice(0, searchLimit)
		.map((board) => ({
			uuid: board.uuid,
			name: board.name,
			owner: board.owner,
			ownerName: ownerDisplayName,
			role: 'owner' as const
		}));

	const filteredSharedBoards = (sharedBoards ?? []).filter((board) => board.owner !== userId);
	const ownerIds = Array.from(new Set(filteredSharedBoards.map((board) => board.owner)));
	const ownerEntries = await Promise.all(
		ownerIds.map(async (ownerId) => [ownerId, await UserConnector.get(ownerId as UUID)] as const)
	);
	const ownerNameById = new Map(
		ownerEntries.map(([ownerId, owner]) => [
			ownerId,
			owner?.username?.trim() || owner?.email?.trim() || 'Unknown'
		])
	);

	const normalizedSharedBoards = filteredSharedBoards
		.map((board) => ({
			board,
			ownerName: ownerNameById.get(board.owner) ?? 'Unknown'
		}))
		.filter(({ board, ownerName }) =>
			boardMatchesSearch(board.name, board.uuid, ownerName, normalizedQuery)
		)
		.sort((left, right) => compareBoardsByName(left.board, right.board))
		.slice(0, searchLimit)
		.map(({ board, ownerName }) => ({
			uuid: board.uuid,
			name: board.name,
			owner: board.owner,
			ownerName,
			role: board.editors?.includes(userId) ? ('editor' as const) : ('viewer' as const)
		}));

	return json({
		query,
		ownedBoards: normalizedOwnedBoards,
		sharedBoards: normalizedSharedBoards
	});
};

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
