import { assert } from "../../../shared/src";
import { InventoryComponentArray } from "../game/entity-components/server-components/InventoryComponent";
import { playerInstance } from "../game/player";
import { createChat, destroyChat } from "./game/Chat";
import { createFrameGraph, destroyFrameGraph } from "./game/dev/FrameGraph";
import { closeGameInteractableLayer, openGameInteractableLayer } from "./game/GameInteractableLayer";
import { createHealthBar, destroyHealthBar } from "./game/HealthBar";
import { createHotbar, destroyHotbar } from "./game/inventories/Hotbar";

let canvas: HTMLCanvasElement | undefined;

export function openGameScreen(): void {
   canvas!.hidden = false;

   if (playerInstance !== null) {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
      createHotbar(inventoryComponent, playerInstance);
      createHealthBar();
   }
   openGameInteractableLayer();
   createChat();
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
   destroyChat();
   destroyFrameGraph();
}

export function setGameScreenCanvas(gameCanvas: HTMLCanvasElement): void {
   assert(canvas === undefined);
   canvas = gameCanvas;
}

export function gameScreenIsOpen(): boolean {
   return canvas !== undefined;
}

/*

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