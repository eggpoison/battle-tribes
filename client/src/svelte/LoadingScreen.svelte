<script lang="ts">
   import { loadingScreenState, LoadingScreenState, setLoadingScreenState } from "../stores/loading-screen-state.svelte";
   import { AppState, setAppState } from "../stores/app-state.svelte";

   function openMainMenu(): void {
      setAppState(AppState.mainMenu);
   }

   function reconnect(): void {
      // @SQUEAM @Incomplete: the actual reconnection logic!
      setLoadingScreenState(LoadingScreenState.establishingConnection);
   }
</script>

<div id="loading-screen">
   <div class="content">
      {#if loadingScreenState === LoadingScreenState.connectionError}
         <h1 class="title">Connection closed</h1>
         
         <div class="loading-message">
            <p>Connection with server failed.</p>

            <button onclick={reconnect}>Reconnect</button>
            <button onclick={openMainMenu}>Back</button>
         </div>
      {:else}
         <h1 class="title">Loading</h1>

         <div class="loading-message">
            {#if loadingScreenState === LoadingScreenState.establishingConnection}
               <p>Connecting to server...</p>
            {:else if loadingScreenState === LoadingScreenState.sendingPlayerData}
               <p>Sending player data...</p>
            {:else}
               <p>Initialising game...</p>
            {/if}
         </div>
      {/if}
   </div>
</div>

<style>
   @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700;900&display=swap');

   #loading-screen {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5) inset;
   }
   #loading-screen .content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
   }
   #loading-screen .content * {
      font-family: "Inconsolata";
      text-align: center;
   }
   #loading-screen h1 {
      font-weight: 70;
   }
</style>