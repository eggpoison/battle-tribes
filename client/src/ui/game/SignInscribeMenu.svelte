<script lang="ts">
   import { FloorSignComponentArray } from "../../game/entity-components/server-components/FloorSignComponent";
   import { sendSetSignMessagePacket } from "../../game/networking/packet-sending";
   import { closeCurrentMenu } from "../../game/menus";
   import { entityInteractionState } from "../../ui-state/entity-interaction-state.svelte";
   import MenuElem from "./menus/MenuElem.svelte";

   // @Hack: "!"
   const entity = entityInteractionState.selectedEntity!;
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);

   let message = $state(floorSignComponent.message);
   
   const inscribe = (): void => {
      sendSetSignMessagePacket(entity, message);
      closeCurrentMenu();
   }
</script>

<MenuElem id="sign-inscribe-menu" className="menu">
   <h2 class="menu-title">Inscribe Sign</h2>

   <input bind:value={message} class="message" type="text" />

   <button onclick={inscribe}>Done</button>
</MenuElem>