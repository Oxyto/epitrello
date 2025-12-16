import { getUserById, getBoardsByOwnerId } from '$lib/server/fakeDb';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const userId = params.user_id;

    const user = getUserById(userId);
    const boards = getBoardsByOwnerId(userId);
    
    if (!user) {
        return {
            user_id: userId,
            email: null,
            name: null,
            boards
        };
    }

    return {
        user_id: user.id,
        email: user.email,
        name: user.name,
        boards
    };
}
