<script lang="ts">
   import { TribeType } from "../../../shared/src/tribes";
   import { establishNetworkConnection } from "../game/client";
   import { AppState, setAppState } from "../stores/app-state.svelte";

   const MAX_USERNAME_CHARS = 48

   let username = $state("");
   let tribeType = $state(TribeType.plainspeople);
   let isSpectating = $state(false);

   /** Checks whether a given username is valid or not */
   const usernameIsValid = (): [warning: string, isValid: false] | [warning: null, isValid: true] => {
      if (username.length > MAX_USERNAME_CHARS) return ["Name cannot be more than " + MAX_USERNAME_CHARS + " characters long!", false];
      if (username.length === 0) return ["Name cannot be empty!", false];
      
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
      setAppState(AppState.loading);
   }
</script>

<div id="main-menu">
   <div class="content">
      <form onsubmit={handlePlay}>
         <!-- svelte-ignore a11y_autofocus -->
         <input type="text" bind:value={username} onkeydown={pressEnter} placeholder="Enter name here" autoFocus />

         <div>
            <label for="tribe-selection-plainspeople">
               Plainspeople
               <input type="radio" id="tribe-selection-plainspeople" name="tribe-selection" defaultChecked />
            </label>
            <label for="tribe-selection-barbarians">
               Barbarians
               <input type="radio" id="tribe-selection-barbarians" name="tribe-selection" />
            </label>
            <label for="tribe-selection-frostlings">
               Frostlings
               <input type="radio" id="tribe-selection-frostlings" name="tribe-selection" />
            </label>
            <label for="tribe-selection-goblins">
               Goblins
               <input type="radio" id="tribe-selection-goblins" name="tribe-selection"/>
            </label>
            <label for="tribe-selection-dwarves">
               Dwarves
               <input type="radio" id="tribe-selection-dwarves" name="tribe-selection"/>
            </label>
         </div>

         <label>
            Spectate
            <input type="checkbox" />
         </label>
         
         <button type="submit">Play</button>
      </form>
   </div>
</div>;

<style>
   /* @Cleanup: two absolutes? wtf */
   
   #main-menu {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
   }

   .content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
   }

   form {
      display: flex;
      flex-direction: column;
      align-items: center;
   }
   form {
      margin: 5px;
   }
   button {
      padding: 0 10px;
   }
</style>