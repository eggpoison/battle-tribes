<script lang="ts">
   import { sendRenameAnimalPacket } from "../../../game/networking/packet-sending/packet-sending";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state";
   import { menuSelectorState } from "../../../ui-state/menu-selector-state";
   import MenuElem from "../menus/MenuElem.svelte";

   // @Hack: "!"
   const entity = entitySelectionState.selectedEntity!;
   
   let name = $state("");

   function doRename(): void {
      sendRenameAnimalPacket(entity, name);
      menuSelectorState.closeCurrentMenu();
   }

   const cancelRename = (): void => {
      menuSelectorState.closeCurrentMenu();
   }
</script>
   
<MenuElem id="taming-rename-prompt">
   <p>Choose a name for your animal:</p>
   <input bind:value={name} type="text" />
   <button onclick={doRename}>Done</button>
   <button onclick={cancelRename}>Cancel</button>
</MenuElem>