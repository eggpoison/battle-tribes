<script lang="ts">
   import { Inventory, InventoryName, ItemType, Settings, AMMO_INFO_RECORD } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { AmmoBoxComponentArray } from "../../../game/entity-components/server-components/AmmoBoxComponent";
   import RemainingAmmoSlider from "./RemainingAmmoSlider.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import InventoryContainer from "./InventoryContainer.svelte";
   import { CLIENT_STATUS_EFFECT_INFO_RECORD } from "../../../game/status-effects";

   const getAmmoSlot = (ammoBoxInventory: Inventory): number => {
      for (let itemSlot = 1; itemSlot <= ammoBoxInventory.width * ammoBoxInventory.height; itemSlot++) {
         if (ammoBoxInventory.itemSlots.hasOwnProperty(itemSlot)) {
            return itemSlot;
         }
      }

      return -1;
   }

   // @Hack: "!"
   const ballista = entityInteractionState.selectedEntity!;
   
   const inventoryComponent = InventoryComponentArray.getComponent(ballista);
   const inventory = getInventory(inventoryComponent, InventoryName.ammoBoxInventory)!;
   
   const nextAmmoSlot = getAmmoSlot(inventory);
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(ballista);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="ammo-box-menu" class="menu" oncontextmenu={e => e.preventDefault()}>
   <h2 class="menu-title">Ammo Box</h2>
   <div class="area-row">
      <div class="area">
         <p>Bolt type: {ammoBoxComponent.ammoRemaining > 0 ? CLIENT_ITEM_INFO_RECORD[ammoBoxComponent.ammoType!].name : "None"}</p>
         <RemainingAmmoSlider ammoType={ammoBoxComponent.ammoType} ammoRemaining={ammoBoxComponent.ammoRemaining} />
      </div>
      <div class="area">
         <label>
            <input type="checkbox" defaultChecked={false} />
            Hold Fire
         </label>
      </div>
   </div>
   <InventoryContainer entityID={ballista} inventory={inventory} selectedItemSlot={nextAmmoSlot !== -1 ? nextAmmoSlot : undefined} />
</div>
<div id="ammo-guide" class="menu">
   <h2 class="menu-title">Ammo Guide</h2>
   {#each Object.entries(AMMO_INFO_RECORD) as [itemTypeString, ammoInfo]}
      {@const itemType: ItemType = Number(itemTypeString)}
      {@const clientItemInfo = CLIENT_ITEM_INFO_RECORD[itemType]}
      
      <div class="area" class:selected={ammoBoxComponent.ammoRemaining > 0 && itemType === ammoBoxComponent.ammoType} class:deselected={ammoBoxComponent.ammoRemaining > 0 && itemType !== ammoBoxComponent.ammoType}>
         <h3><img src={getItemTypeImage(itemType)} alt="" />{clientItemInfo.name}</h3>
         <p><span>{ammoInfo.damage}</span> damage</p>
         <p><span>{ammoInfo.ammoMultiplier}x</span> ammo multiplier</p>
         <p><span>{(ammoInfo.shotCooldownTicks + ammoInfo.reloadTimeTicks) * Settings.DT_S}s</span> reload time</p>
         {#if ammoInfo.statusEffect !== null}
            <p><i>Inflicts <span>{ammoInfo.statusEffect.durationTicks * Settings.DT_S}s</span> of <span style:color={CLIENT_STATUS_EFFECT_INFO_RECORD[ammoInfo.statusEffect.type].colour}></span>.</i></p>
         {/if}
      </div>
   {/each}
</div>