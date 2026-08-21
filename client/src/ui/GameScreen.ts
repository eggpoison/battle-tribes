import { assert } from "../../../shared/src/utils";
import { playerInstance } from "../game/player";
import { createChat, destroyChat } from "./game/Chat";
import { createFrameGraph, destroyFrameGraph } from "./game/dev/FrameGraph";
import { closeGameInteractableLayer, openGameInteractableLayer } from "./game/GameInteractableLayer";
import { createHealthBar, destroyHealthBar } from "./game/HealthBar";
import { destroyHotbar, hotbarIsVisible } from "./game/inventories/Hotbar";
import { closeMenu, getMenu, MenuType, openMenu } from "./menus";

let canvas: HTMLCanvasElement | undefined;

export function openGameScreen(): void {
   canvas!.hidden = false;

   if (playerInstance !== null) {
      openMenu(getMenu(MenuType.hotbar), playerInstance);
      openMenu(getMenu(MenuType.heldItem), playerInstance);
      createHealthBar();
   }
   openGameInteractableLayer();
   createChat();
   
   if (__DEV__) {
      createFrameGraph();
   }
}

export function closeGameScreen(): void {
   destroyHotbar();
   destroyHealthBar();
   closeGameInteractableLayer();
   destroyChat();
   destroyFrameGraph();
}

export function toggleCinematicMode(): void {
   if (hotbarIsVisible()) {
      closeMenu(getMenu(MenuType.hotbar));
      destroyHealthBar();
   } else if (playerInstance !== null) {
      openMenu(getMenu(MenuType.hotbar), playerInstance);
      createHealthBar();
   }
}

export function setGameScreenCanvas(gameCanvas: HTMLCanvasElement): void {
   assert(canvas === undefined);
   canvas = gameCanvas;
}

export function gameScreenIsOpen(): boolean {
   return canvas !== undefined;
}

/* @INCOMPLETE

{#if !gameUIState.cinematicModeIsEnabled}
   <HealthBar />
   <Infocards />
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