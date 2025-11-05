<script lang="ts">
    import TopBar from '../top_bar.svelte';
</script>

<TopBar login={true} />
<div
    id="login-content"
    class="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-100 p-8"
>
    <div
        id="login-form-container"
        class="w-full max-w-md max-h-[calc(100vh-6rem)] rounded bg-white p-8 shadow-lg"
    >
        <h2 class="mb-6 text-2xl font-semibold text-center">Login to EpiTrello</h2>
        <form id="login-form" class="flex flex-col gap-4">
            <div class="flex flex-col">
                <label for="email" class="mb-2 font-medium">Email:</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    class="rounded border border-gray-300 p-2"
                    required
                />
            </div>
            <div class="flex flex-col">
                <label for="password" class="mb-2 font-medium">Password:</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    class="rounded border border-gray-300 p-2"
                    required
                />
            </div>
            <button
                type="submit"
                class="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
                Login
            </button>
        </form>
    </div>
</div>
