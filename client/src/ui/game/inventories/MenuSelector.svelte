<script lang="ts">
   import BarrelInventory from "./BarrelInventory.svelte";
   import CookingInventory from "./CookingInventory.svelte";
   import TombstoneEpitaph from "./TombstoneEpitaph.svelte";
   import TribesmanInteractMenu from "./TribesmanInteractMenu.svelte";
   import AmmoBoxInventory from "./AmmoBoxInventory.svelte";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state.svelte";
   import BuildMenu from "../menus/BuildMenu.svelte";
   import TamingMenu from "../taming-menu/TamingMenu.svelte";
   import SignInscribeMenu from "../SignInscribeMenu.svelte";
   import HealthInspector from "../HealthInspector.svelte";
   import AnimalStaffOptions from "../AnimalStaffOptions.svelte";
   import TamingRenamePrompt from "../taming-menu/TamingRenamePrompt.svelte";
   import BackpackInventory from "./BackpackInventory.svelte";
   import CraftingMenu from "../menus/crafting-menu/CraftingMenu.svelte";
   import ItemsTab from "../dev/tabs/ItemsTab.svelte";
   import SummonTab from "../dev/tabs/SummonTab.svelte";
   import TitlesTab from "../dev/tabs/TitlesTab.svelte";
   import TribesTab from "../dev/tabs/TribesTab.svelte";
   import TribePlanVisualiser from "../tribe-plan-visualiser/TribePlanVisualiser.svelte";
   import { tribePlanVisualiserState } from "../../../ui-state/tribe-plan-visualiser-state.svelte";
   import TechTree from "../tech-tree/TechTree.svelte";

   const selectedEntity = $derived(entitySelectionState.selectedEntity);
</script>

{#each menuSelectorState.menuStack as menuInfo}
   {@const menu = menuInfo.menu}

   {#if menu === Menu.barrelInventory}
      {#if selectedEntity !== null}
         <BarrelInventory entity={selectedEntity} />
      {/if}
   {:else if menu === Menu.tribesmanInventory}
      <TribesmanInteractMenu />
   {:else if menu === Menu.campfireInventory || menu === Menu.furnaceInventory}
      <CookingInventory />
   {:else if menu === Menu.tombstoneEpitaph}
      <TombstoneEpitaph />;
   {:else if menu === Menu.ammoBoxInventory}
      <AmmoBoxInventory />;
   {:else if menu === Menu.buildMenu}
      {#if selectedEntity !== null}
         <BuildMenu entity={selectedEntity} />
      {/if}
   {:else if menu === Menu.tamingMenu}
      {#if selectedEntity !== null}
         <TamingMenu entity={selectedEntity} />
      {/if}
   {:else if menu === Menu.signInscribeMenu}
      <SignInscribeMenu />
   {:else if menu === Menu.animalStaffOptions}
      {#if selectedEntity !== null}
         <AnimalStaffOptions entity={selectedEntity} />
      {/if}
   {:else if menu === Menu.tamingRenamePrompt}
      <TamingRenamePrompt />
   {:else if menu === Menu.craftingMenu}
      <!-- Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks -->
      <BackpackInventory />
      <CraftingMenu  />
   {:else if menu === Menu.healthInspector}
      <HealthInspector />
   {:else if menu === Menu.itemsDevTab}
      <ItemsTab />
   {:else if menu === Menu.summonDevTab}
      <SummonTab />
   {:else if menu === Menu.titlesDevTab}
      <TitlesTab />
   {:else if menu === Menu.tribesDevTab}
      <TribesTab />
   {:else if menu === Menu.tribePlanVisualiser}
      {#if tribePlanVisualiserState.tribe !== null && tribePlanVisualiserState.tribeAssignmentInfo !== null}
         <TribePlanVisualiser tribe={tribePlanVisualiserState.tribe} tribeAssignmentInfo={tribePlanVisualiserState.tribeAssignmentInfo} />
      {/if}
   {:else if menu === Menu.techTree}
      <TechTree />
   {/if}
   <!-- @SQUEAM for pre-stamina-bar shots -->
   <!-- <CowStaminaBar /> -->
{/each}