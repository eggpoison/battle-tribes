<script lang="ts">
   import BarrelInventory from "./BarrelInventory.svelte";
   import CookingInventory from "./CookingInventory.svelte";
   import TombstoneEpitaph from "./TombstoneEpitaph.svelte";
   import TribesmanInteractMenu from "./TribesmanInteractMenu.svelte";
   import AmmoBoxInventory from "./AmmoBoxInventory.svelte";
   import { entityExists } from "../../../game/world";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import BuildMenu from "../menus/BuildMenu.svelte";
   import TamingMenu from "../taming-menu/TamingMenu.svelte";
   import SignInscribeMenu from "../SignInscribeMenu.svelte";
   import HealthInspector from "../HealthInspector.svelte";
   import AnimalStaffOptions from "../AnimalStaffOptions.svelte";
   import TamingRenamePrompt from "../taming-menu/TamingRenamePrompt.svelte";
   import BackpackInventory from "./BackpackInventory.svelte";
   import CraftingMenu from "../menus/crafting-menu/CraftingMenu.svelte";

   const menu = $derived(menuSelectorState.menu);
</script>

{#if menu === Menu.barrelInventory}
   {#if entityInteractionState.selectedEntity !== null}
      <BarrelInventory entity={entityInteractionState.selectedEntity} />
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
   <BuildMenu />
{:else if menu === Menu.tamingMenu}
   <TamingMenu />
{:else if menu === Menu.signInscribeMenu}
   <SignInscribeMenu />
{:else if menu === Menu.animalStaffOptions}
   <AnimalStaffOptions />
{:else if menu === Menu.tamingRenamePrompt}
   <TamingRenamePrompt />
{:else if menu === Menu.craftingMenu}
   <!-- Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks -->
   <BackpackInventory />
   <CraftingMenu  />
{:else if menu === Menu.healthInspector}
   <HealthInspector />
{/if}