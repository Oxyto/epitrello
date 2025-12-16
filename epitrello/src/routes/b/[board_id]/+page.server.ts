import { getBoardById } from '$lib/server/fakeDb';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
    const boardId = params.board_id;
    const board = getBoardById(boardId);

    if (!board) {
        throw error(404, 'Board not found');
    }

    return {
        board_id: board.id,
        board_name: board.name
    };
};
