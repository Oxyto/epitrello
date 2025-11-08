<script lang="ts">
    export let card: { id: number; title: string };
</script>

<li class="card-item flex h-12 items-center gap-2 rounded bg-gray-700 ps-2" draggable="true">
	<input type="checkbox" class="rounded-4xl mr-2 hover:cursor-pointer" title="Mark as complete" />
	<span
		><a
			class="text-md h-full w-full select-none rounded border-0 bg-gray-700"
			draggable="false"
			href="#c-{card.id}">{card.title}</a
		></span
	>
</li>
