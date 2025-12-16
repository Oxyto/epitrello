import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBoard, getBoardsByOwnerId, deleteBoard} from '$lib/server/fakeDb';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!body || !body.ownerId || !body.name) {
        return json({ error: 'ownerId et name requis' }, { status: 400 });
    }

    const board = createBoard(String(body.ownerId), String(body.name));
    return json(board);
};

export const GET: RequestHandler = async ({ url }) => {
    const ownerId = url.searchParams.get('ownerId');
    if (!ownerId) {
        return json({ error: 'ownerId requis' }, { status: 400 });
    }

    const boards = getBoardsByOwnerId(ownerId);
    return json({ boards });
};

export const DELETE: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get('id');
    if (!id) {
        return json({ error: 'id requis' }, { status: 400 });
    }

    const ok = deleteBoard(id);
    if (!ok) {
        return json({ error: 'Board not found' }, { status: 404 });
    }

    return json({ success: true });
};