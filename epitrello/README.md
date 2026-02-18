# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## User Role Maintenance

This project now uses three global user roles:

- `student`
- `ape`
- `admin`

To migrate existing users that still rely on the legacy `admin` flag:

```sh
bun run migrate:user-roles
```

You can preview changes without writing:

```sh
bun run migrate:user-roles -- --dry-run
```

To initialize/promote an admin account by email:

```sh
bun run ensure-admin -- admin@example.com
```

To create the account if it does not exist:

```sh
bun run ensure-admin -- admin@example.com --create
```
