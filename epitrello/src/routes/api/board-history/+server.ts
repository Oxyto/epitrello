import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireBoardAccess } from '$lib/server/boardAccess';
import { getBoardHistoryEntries } from '$lib/server/boardHistory';
import { UserConnector, type UUID } from '$lib/server/redisConnector';

function resolveActorDisplayName({
	userId,
	username,
	email
}: {
	userId: string;
	username?: string | null;
	email?: string | null;
}) {
	const normalizedUsername = typeof username === 'string' ? username.trim() : '';
	if (normalizedUsername.length > 0) {
		return normalizedUsername;
	}

	const normalizedEmail = typeof email === 'string' ? email.trim() : '';
	if (normalizedEmail.length > 0) {
		return normalizedEmail;
	}

	return userId;
}

export const GET: RequestHandler = async ({ url }) => {
	const boardId = url.searchParams.get('boardId');
	const userId = url.searchParams.get('userId');
	const rawLimit = url.searchParams.get('limit');

	if (!boardId) {
		throw error(400, 'boardId required');
	}
	if (!userId) {
		throw error(400, 'userId required');
	}

	await requireBoardAccess(boardId as UUID, userId, 'view');

	const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN;
	const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

	const entries = await getBoardHistoryEntries(boardId, limit);
	const actorIds = Array.from(
		new Set(entries.map((entry) => entry.actorId).filter((id): id is string => Boolean(id)))
	);

	const actorProfiles = await Promise.all(
		actorIds.map(async (actorId) => [actorId, await UserConnector.get(actorId as UUID)] as const)
	);
	const actorNameById = new Map<string, string>(
		actorProfiles.map(([actorId, actor]) => [
			actorId,
			resolveActorDisplayName({
				userId: actorId,
				username: actor?.username,
				email: actor?.email
			})
		])
	);

	return json({
		entries: entries.map((entry) => ({
			id: entry.id,
			source: entry.source,
			action: entry.action,
			message: entry.message,
			createdAt: entry.createdAt,
			metadata: entry.metadata,
			actor: {
				id: entry.actorId,
				name: entry.actorId ? (actorNameById.get(entry.actorId) ?? entry.actorId) : 'System'
			}
		}))
	});
};
