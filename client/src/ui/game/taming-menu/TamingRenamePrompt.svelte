<script lang="ts">
   import { sendRenameAnimalPacket } from "../../../game/networking/packet-sending";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state.svelte";
    import { menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import MenuElem from "../menus/MenuElem.svelte";

   // @Hack: "!"
   const entity = entitySelectionState.selectedEntity!;
   
   let name = $state("");

   function doRename(): void {
      sendRenameAnimalPacket(entity, name);
      menuSelectorState.closeMenu();
   }

   const cancelRename = (): void => {
      menuSelectorState.closeMenu();
   }
</script>
   
<MenuElem id="taming-rename-prompt">
   <p>Choose a name for your animal:</p>
   <input bind:value={name} type="text" />
   <button onclick={doRename}>Done</button>
   <button onclick={cancelRename}>Cancel</button>
</MenuElem>