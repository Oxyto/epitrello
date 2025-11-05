<script lang="ts">
	import TopBar from './top_bar.svelte';
</script>

<TopBar login={false} />
<div id="content" class="flex h-screen flex-col items-center justify-start z-0">
	<div
		id="welcome-section"
		class="h-128 mb-10 flex w-screen flex-row justify-center bg-gray-100 p-48 text-center"
	>
		<h1 class="size-128 select-none text-left font-mono text-5xl font-bold">
			Capture, organize, and share your ideas !
		</h1>
		<img
			id="welcome-image"
			src="/illustrations/phone.png"
			alt="Welcome Illustration"
			class="mx-auto mt-6"
		/>
	</div>
	<div id="features-section" class="mb-10 grid w-screen grid-rows-3 gap-16 p-16">
		<div
			class="feature-card border-l-16 w-1/4 rounded-xl border-amber-500 bg-white p-6 text-center shadow-lg"
		>
			<h2 class="mb-2 text-2xl font-semibold">Feature 1</h2>
			<p>Describe the first amazing feature of Epitrello here.</p>
		</div>
		<div
			class="feature-card border-l-16 w-1/4 rounded-xl border-amber-500 bg-white p-6 text-center shadow-lg"
		>
			<h2 class="mb-2 text-2xl font-semibold">Feature 2</h2>
			<p>Describe the second amazing feature of Epitrello here.</p>
		</div>
		<div
			class="feature-card border-l-16 w-1/4 rounded-xl border-amber-500 bg-white p-6 text-center shadow-lg"
		>
			<h2 class="mb-2 text-2xl font-semibold">Feature 3</h2>
			<p>Describe the third amazing feature of Epitrello here.</p>
		</div>
	</div>
	<div id="footer" class="w-full bg-gray-800 p-4 text-center text-white">
		<p>&copy; 2025 Epitrello. All rights reserved.</p>
	</div>
</div>
