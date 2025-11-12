<script lang="ts">
   import { FloorSignComponentArray } from "../../game/entity-components/server-components/FloorSignComponent";
   import { sendSetSignMessagePacket } from "../../game/networking/packet-sending";
   import { entitySelectionState } from "../../ui-state/entity-selection-state.svelte";
    import { menuSelectorState } from "../../ui-state/menu-selector-state.svelte";
   import MenuElem from "./menus/MenuElem.svelte";

   // @Hack: "!"
   const entity = entitySelectionState.selectedEntity!;
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);

   let message = $state(floorSignComponent.message);
   
   const inscribe = (): void => {
      sendSetSignMessagePacket(entity, message);
      menuSelectorState.closeMenu();
   }
</script>

<MenuElem id="sign-inscribe-menu">
   <h2 class="menu-title">Inscribe Sign</h2>

   <input bind:value={message} class="message" type="text" />

   <button onclick={inscribe}>Done</button>
</MenuElem>