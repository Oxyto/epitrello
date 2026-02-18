import { beforeEach, describe, expect, it } from 'bun:test';
import { resetMockState, state, usersRoute } from './routes-db-mocking.shared';

beforeEach(resetMockState);

describe('api/users +server', () => {
	it('PATCH returns 400 when payload is incomplete', async () => {
		const response = await usersRoute.PATCH({
			request: new Request('http://localhost/api/users', {
				method: 'PATCH',
				body: JSON.stringify({ userId: 'user-1' })
			})
		} as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: 'userId, requesterId and displayName are required'
		});
		expect(state.userUpdateCalls).toHaveLength(0);
	});

	it('PATCH returns 403 when requester does not match target user', async () => {
		const response = await usersRoute.PATCH({
			request: new Request('http://localhost/api/users', {
				method: 'PATCH',
				body: JSON.stringify({
					userId: 'user-1',
					requesterId: 'user-2',
					displayName: 'Alice'
				})
			})
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: 'Forbidden' });
		expect(state.userUpdateCalls).toHaveLength(0);
	});

	it('PATCH returns 404 when user does not exist', async () => {
		state.boardsUser = null;

		const response = await usersRoute.PATCH({
			request: new Request('http://localhost/api/users', {
				method: 'PATCH',
				body: JSON.stringify({
					userId: 'user-1',
					requesterId: 'user-1',
					displayName: 'Alice'
				})
			})
		} as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'User not found' });
		expect(state.userUpdateCalls).toHaveLength(0);
	});

	it('PATCH updates display name when payload is valid', async () => {
		const response = await usersRoute.PATCH({
			request: new Request('http://localhost/api/users', {
				method: 'PATCH',
				body: JSON.stringify({
					userId: 'user-1',
					requesterId: 'user-1',
					displayName: '  Alice Cooper  '
				})
			})
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, name: 'Alice Cooper' });
		expect(state.userUpdateCalls).toEqual([
			{ userId: 'user-1', updates: { username: 'Alice Cooper' } }
		]);
	});

	it('DELETE returns 400 when query parameters are missing', async () => {
		const response = await usersRoute.DELETE({
			url: new URL('http://localhost/api/users?id=user-1')
		} as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'id and requesterId are required' });
		expect(state.userDeleteCalls).toHaveLength(0);
	});

	it('DELETE returns 403 when requester does not match target user', async () => {
		const response = await usersRoute.DELETE({
			url: new URL('http://localhost/api/users?id=user-1&requesterId=user-2')
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: 'Forbidden' });
		expect(state.userDeleteCalls).toHaveLength(0);
	});

	it('DELETE returns 404 when user does not exist', async () => {
		state.boardsUser = null;

		const response = await usersRoute.DELETE({
			url: new URL('http://localhost/api/users?id=user-1&requesterId=user-1')
		} as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'User not found' });
		expect(state.userDeleteCalls).toHaveLength(0);
	});

	it('DELETE removes user account when requester matches', async () => {
		const response = await usersRoute.DELETE({
			url: new URL('http://localhost/api/users?id=user-1&requesterId=user-1')
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.userDeleteCalls).toEqual(['user-1']);
	});
});
