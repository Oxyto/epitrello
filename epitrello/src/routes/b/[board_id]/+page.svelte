<script lang="ts">
	import BoardPageShell from './BoardPageShell.svelte';

	const { data } = $props<{
		data: {
			board: { id: string; name: string } | undefined;
		};
	}>();
</script>

<BoardPageShell {data} />
