import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireBoardAccess } from '$lib/server/boardAccess';
import { notifyBoardUpdated } from '$lib/server/boardEvents';
import type { UUID } from '$lib/server/redisConnector';

function normalizeText(value: unknown) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	const boardId = normalizeText(body?.boardId);
	const userId = normalizeText(body?.userId);
	const batchName = normalizeText(body?.batchName);
	const phase = normalizeText(body?.phase);
	const operationCount = Number.parseInt(String(body?.operationCount ?? '0'), 10);

	if (!boardId || !userId || !batchName || (phase !== 'started' && phase !== 'undone')) {
		throw error(400, 'boardId, userId, batchName and valid phase are required');
	}

	await requireBoardAccess(boardId as UUID, userId, 'edit');

	if (phase === 'started') {
		notifyBoardUpdated({
			boardId,
			actorId: userId,
			source: 'unknown',
			history: {
				action: 'ai.batch.started',
				message: `Started AI batch "${batchName}" (${operationCount} action(s)). It can be removed with Undo using batch "${batchName}".`,
				metadata: {
					batchName,
					phase,
					operationCount: Number.isFinite(operationCount) ? operationCount : 0
				}
			}
		});
	}

	if (phase === 'undone') {
		notifyBoardUpdated({
			boardId,
			actorId: userId,
			source: 'unknown',
			history: {
				action: 'ai.batch.undone',
				message: `Removed AI batch "${batchName}" with Undo.`,
				metadata: {
					batchName,
					phase,
					operationCount: Number.isFinite(operationCount) ? operationCount : 0
				}
			}
		});
	}

	return json({ ok: true });
};
