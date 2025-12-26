<script lang="ts">
   import { TribeType } from "webgl-test-shared";
   import { establishNetworkConnection } from "../game/client";
   import { appState, AppState } from "../ui-state/app-state.svelte";

   const MAX_USERNAME_CHARS = 48

   let username = $state("");
   let tribeType = $state(TribeType.plainspeople);
   let isSpectating = $state(false);

   /** Checks whether a given username is valid or not */
   const usernameIsValid = (): [warning: string, isValid: false] | [warning: null, isValid: true] => {
      if (username.length > MAX_USERNAME_CHARS) return ["Name cannot be more than " + MAX_USERNAME_CHARS + " characters long!", false];
      if (username.length === 0) return ["Name cannot be empty!", false];

      // Make sure it doesn't contain any funky characters! only unicode or ur out!
      for (const char of username) {
         if (char.charCodeAt(0) > 127) {
            return ["Name cannot contain funky characters!", false];
         }
      }
      
      return [null, true];
   }

   function pressEnter(e: KeyboardEvent): void {
      if (e.code === "Enter") {
         handlePlay();
      }
   }

   function handlePlay() {
      // Make sure the username is valid
      const [warning, isValid] = usernameIsValid();
      if (!isValid) {
         alert(warning);
         return;
      }

      establishNetworkConnection(username, tribeType, isSpectating);
      // @CLEANUP: MOVE INSIDE establishNetworkConnection
      appState.setState(AppState.loading);
   }
</script>

<div id="main-menu">
   <div class="content">
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" bind:value={username} onkeydown={pressEnter} placeholder="Enter name here" autoFocus />

      <div>
         <label for="tribe-selection-plainspeople">
            <input type="radio" id="tribe-selection-plainspeople" name="tribe-selection" defaultChecked />
            Plainspeople
         </label>
         <label for="tribe-selection-barbarians">
            <input type="radio" id="tribe-selection-barbarians" name="tribe-selection" />
            Barbarians
         </label>
         <label for="tribe-selection-frostlings">
            <input type="radio" id="tribe-selection-frostlings" name="tribe-selection" />
            Frostlings
         </label>
         <label for="tribe-selection-goblins">
            <input type="radio" id="tribe-selection-goblins" name="tribe-selection"/>
            Goblins
         </label>
         <label for="tribe-selection-dwarves">
            <input type="radio" id="tribe-selection-dwarves" name="tribe-selection"/>
            Dwarves
         </label>
      </div>

      <label>
         <input type="checkbox" bind:checked={isSpectating} />
         Spectate
      </label>
      
      <button onclick={handlePlay}>Play</button>
   </div>
</div>

<style>
   #main-menu {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
   }
   
   button {
      display: block;
      padding: 0 10px;
   }
</style>