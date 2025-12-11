import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveUser, type User } from '$lib/server/fakeDb';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!body || !body.email) {
        return json({ error: 'Email requis' }, { status: 400 });
    }

    const email: string = body.email;
    const name: string | null = body.name ?? null;

    const user: User = {
        id: '1',
        email,
        name
    };

    saveUser(user);

    return json(user);
};
