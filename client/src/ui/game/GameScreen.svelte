<script lang="ts">
   import ChatBox from "./ChatBox.svelte";
   import TechTree from "./tech-tree/TechTree.svelte";
   import TechInfocard from "./TechInfocard.svelte";
   import MenuSelector from "./inventories/MenuSelector.svelte";
   import Infocards from "./infocards/Infocards.svelte";
   import SummonCrosshair from "./SummonCrosshair.svelte";
   import GameInteractableLayer from "./GameInteractableLayer.svelte";
   import TribePlanVisualiser from "./tribe-plan-visualiser/TribePlanVisualiser.svelte";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import DeathScreen from "./DeathScreen.svelte";
   import HealthBar from "./HealthBar.svelte";
   import NerdVision from "./dev/NerdVision.svelte";
   import { entityInteractionState } from "../../ui-state/entity-interaction-state.svelte";
   import LayerChangeMessage from "./LayerChangeMessage.svelte";
   import { tribePlanVisualiserState } from "../../ui-state/tribe-plan-visualiser-state.svelte";
   import { techTreeState } from "../../ui-state/tech-tree-state.svelte";

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
   <!-- <div id="summon-entity-veil" onmousedown={e => placeEntity(e.nativeEvent)}></div> -->
{/if}

{#if techTreeState.isVisible}
   <TechTree />
{/if}
<TechInfocard />

{#if tribePlanVisualiserState.tribe !== null && tribePlanVisualiserState.tribeAssignmentInfo !== null}
   <TribePlanVisualiser tribe={tribePlanVisualiserState.tribe} tribeAssignmentInfo={tribePlanVisualiserState.tribeAssignmentInfo} />
{/if}

<MenuSelector />

<!-- @SQUEAM for pre-stamina-bar shots -->
<!-- <CowStaminaBar /> -->

{#if gameUIState.canAscendLayer}
   <LayerChangeMessage />
{/if}

{#if !gameUIState.isSimulating}
   <h1 class="simulation-pause-label">(Server simulation has been paused manually)</h1>
{/if}