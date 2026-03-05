export function openGameScreen() {
   // Unhide all the canvases!
   document.getElementById("canvas-wrapper")?.classList.remove("invis");
   
   // const gameScreenElem = document.createElement("div");
   // gameScreenElem.id = "game-screen";
   // gameScreenElem.innerHTML = `
   // `;
}

export function closeGameScreen() {
   document.getElementById("canvas-wrapper")?.classList.add("invis");
   // document.getElementById("game-screen")?.remove();
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