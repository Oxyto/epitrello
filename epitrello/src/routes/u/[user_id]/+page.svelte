<script>
    import UserSearchBar from './user_search_bar.svelte';

    const { data } = $props();
    console.log(data);
</script>

<UserSearchBar />
<h1>User Page for ID: {data.user_id}</h1>
