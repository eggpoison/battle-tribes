<script lang="ts">
   import ChatBox from "./ChatBox";
   import CraftingMenu from "./menus/CraftingMenu";
   import TechTree from "./tech-tree/TechTree";
   import BuildMenu from "./BuildMenu";
   import TechInfocard from "./TechInfocard";
   import InventorySelector from "./inventories/InventorySelector";
   import HealthInspector from "./HealthInspector";
   import Infocards from "./infocards/Infocards";
   import SummonCrosshair from "./SummonCrosshair";
   import GameInteractableLayer from "./GameInteractableLayer";
   import TribePlanVisualiser from "./tribe-plan-visualiser/TribePlanVisualiser";
   import { ItemTooltip } from "./inventories/ItemTooltip";
   import AnimalStaffOptions from "./AnimalStaffOptions";
   import TamingMenu from "./taming-menu/TamingMenu";
   import SignInscribeMenu from "./SignInscribeMenu";
   import TamingRenamePrompt from "./taming-menu/TamingRenamePrompt";
</script>
   
<GameInteractableLayer hotbar={hotbar} offhand={offhand} backpackSlot={backpackSlot} armourSlot={armourSlot} gloveSlot={gloveSlot} heldItemSlot={heldItemSlot} cinematicModeIsEnabled={cinematicModeIsEnabled} gameInteractState={interactState} setGameInteractState={setInteractState} />

<ChatBox />

{!cinematicModeIsEnabled ? <>
   <HealthBar isDead={isDead} />
   <Infocards />
</> : undefined}

{/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
<BackpackInventoryMenu />
<CraftingMenu craftingOutputSlot={craftingOutputSlot} hotbar={hotbar} backpack={backpack} />

{isDead ? (
   <DeathScreen setAppState={props.setAppState} />
) : undefined}

{interactState !== GameInteractState.summonEntity ? (
   <NerdVision isSimulating={isSimulating} summonPacketRef={summonPacketRef} setGameInteractState={setInteractState} />
) : <>
   <div id="summon-prompt">
      <div className="line left"></div>
      <h2>Click to spawn</h2>
      <div className="line right"></div>
   </div>

   <SummonCrosshair />

   <div id="summon-entity-veil" onMouseDown={e => placeEntity(e.nativeEvent)}></div>
</>}

<TechTree />
<TechInfocard />

<TribePlanVisualiser />

<BuildMenu />

<InventorySelector />

<HealthInspector />

<ItemTooltip />

<AnimalStaffOptions setGameInteractState={setInteractState} />

<TamingMenu />
<TamingRenamePrompt />

<SignInscribeMenu />

{/* @SQUEAM for pre-stamina-bar shots */}
{/* <CowStaminaBar /> */}

{ canAscendLayer ? (
   <LayerChangeMessage />
) : null }

{ !isSimulating ? (
   <h1 className="simulation-pause-label">(Server simulation has been paused manually)</h1>
) : undefined}