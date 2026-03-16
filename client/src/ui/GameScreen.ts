import { gameIsRunning } from "../game/game";
import { addKeyListener } from "../game/keyboard-input";
import { gameUIState } from "../ui-state/game-ui-state";
import { createFrameGraph, destroyFrameGraph } from "./game/dev/FrameGraph";
import { closeGameInteractableLayer, openGameInteractableLayer } from "./game/GameInteractableLayer";
import { createHealthBar, destroyHealthBar } from "./game/HealthBar";
import { createHotbar, destroyHotbar } from "./game/inventories/Hotbar";

addKeyListener("o", () => {
   // Toggle cinematic mode
   if (gameIsRunning) {
      gameUIState.setCinematicModeIsEnabled(!gameUIState.cinematicModeIsEnabled);
   }
});

export function openGameScreen(): void {
   // Unhide the previous-created game canvas
   document.getElementById("game-canvas")?.classList.remove("hidden");

   createHotbar();
   createHealthBar();
   openGameInteractableLayer();
   // @Speed: only if dev!
   createFrameGraph();
   
   // const gameScreenElem = document.createElement("div");
   // gameScreenElem.id = "game-screen";
   // gameScreenElem.innerHTML = `
   // `;
}

export function closeGameScreen(): void {
   // document.getElementById("game-canvas")?.classList.add("invis");
   // document.getElementById("game-screen")?.remove();

   destroyHotbar();
   destroyHealthBar();
   closeGameInteractableLayer();
   destroyFrameGraph();
}

/*

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

{#if itemTooltipState.item !== null}
   <ItemTooltip item={itemTooltipState.item} />
{/if}

<TechInfocard />

<MenuSelector />

<HeldItemSlot />

{#if gameUIState.canAscendLayer}
   <LayerChangeMessage />
{/if}

{#if !gameUIState.isSimulating}
   <h1 class="simulation-pause-label">(Server simulation has been paused manually)</h1>
{/if}
*/