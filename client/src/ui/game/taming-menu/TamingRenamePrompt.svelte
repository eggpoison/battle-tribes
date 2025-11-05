<script lang="ts">
   import { closeCurrentMenu } from "../../../game/menus";
   import { sendRenameAnimalPacket } from "../../../game/networking/packet-sending";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import MenuElem from "../menus/MenuElem.svelte";

   // @Hack: "!"
   const entity = entityInteractionState.selectedEntity!;
   
   let name = $state("");

   function doRename(): void {
      sendRenameAnimalPacket(entity, name);
      closeCurrentMenu();
   }

   const cancelRename = (): void => {
      closeCurrentMenu();
   }
</script>
   
<MenuElem id="taming-rename-prompt" className="menu">
   <p>Choose a name for your animal:</p>
   <input bind:value={name} type="text" />
   <button onclick={doRename}>Done</button>
   <button onclick={cancelRename}>Cancel</button>
</MenuElem>