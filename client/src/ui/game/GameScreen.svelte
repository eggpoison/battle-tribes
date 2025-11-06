<script lang="ts">
   import ChatBox from "./ChatBox.svelte";
   import CraftingMenu from "./menus/crafting-menu/CraftingMenu.svelte";
   import TechTree from "./tech-tree/TechTree.svelte";
   import BuildMenu from "./menus/BuildMenu.svelte";
   import TechInfocard from "./TechInfocard.svelte";
   import InventorySelector from "./inventories/InventorySelector.svelte";
   import HealthInspector from "./HealthInspector.svelte";
   import Infocards from "./infocards/Infocards.svelte";
   import SummonCrosshair from "./SummonCrosshair.svelte";
   import GameInteractableLayer from "./GameInteractableLayer.svelte";
   import TribePlanVisualiser from "./tribe-plan-visualiser/TribePlanVisualiser.svelte";
   import AnimalStaffOptions from "./AnimalStaffOptions.svelte";
   import TamingMenu from "./taming-menu/TamingMenu.svelte";
   import SignInscribeMenu from "./SignInscribeMenu.svelte";
   import TamingRenamePrompt from "./taming-menu/TamingRenamePrompt.svelte";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import DeathScreen from "./DeathScreen.svelte";
   import HealthBar from "./HealthBar.svelte";
   import BackpackInventory from "./inventories/BackpackInventory.svelte";
   import NerdVision from "./dev/NerdVision.svelte";
   import { entityInteractionState } from "../../ui-state/entity-interaction-state.svelte";
   import LayerChangeMessage from "./LayerChangeMessage.svelte";

   $effect(() => {
      // Reset state
      entityInteractionState.reset();
   });
</script>
   
<GameInteractableLayer />

<ChatBox />

{#if !gameUIState.cinematicModeIsEnabled}
   <HealthBar />
   <Infocards />
{/if}

<!-- Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks -->
<BackpackInventory />
<CraftingMenu  />

{#if gameUIState.isDead}
   <DeathScreen />
{/if}

{#if gameUIState.gameInteractState !== GameInteractState.summonEntity}
   <NerdVision />
{:else}
   <div id="summon-prompt">
      <div class="line left"></div>
      <h2>Click to spawn</h2>
      <div class="line right"></div>
   </div>

   <SummonCrosshair />

   <!-- @INCOMPLETE? wat was this -->
   <!-- svelte-ignore a11y_no_static_element_interactions -->
   <!-- <div id="summon-entity-veil" onmousedown={e => placeEntity(e.nativeEvent)}></div> -->
{/if}

<TechTree />
<TechInfocard />

<TribePlanVisualiser />

<BuildMenu />

<InventorySelector />

<HealthInspector />

<AnimalStaffOptions />

<TamingMenu />
<TamingRenamePrompt />

<SignInscribeMenu />

<!-- @SQUEAM for pre-stamina-bar shots -->
<!-- <CowStaminaBar /> -->

{#if gameUIState.canAscendLayer}
   <LayerChangeMessage />
{/if}

{#if !gameUIState.isSimulating}
   <h1 class="simulation-pause-label">(Server simulation has been paused manually)</h1>
{/if}