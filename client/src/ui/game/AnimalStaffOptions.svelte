<script lang="ts">
   import { type Entity, TamingSkillID } from "webgl-test-shared";
   import { sendAnimalStaffFollowCommandPacket } from "../../game/networking/packet-sending";
   import { entityExists } from "../../game/world";
   import { hasTamingSkill, type TamingComponent } from "../../game/entity-components/server-components/TamingComponent";
   import { RideableComponentArray } from "../../game/entity-components/server-components/RideableComponent";
   import { preventDefault } from "../ui-utils.svelte";
   import { AnimalStaffCommandType, createControlCommandParticles } from "../../game/particles";
   import { entitySelectionState } from "../../ui-state/entity-selection-state.svelte";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import { setShittyCarrier } from "../../game/player-action-handling";

   interface Props {
      entity: Entity;
      // @HACK: shouldn't be needed but some weirdness is causing the AnimalStaffOptions to be rendered for non-tameable entities
      tamingComponent: TamingComponent;
   }
    
   let { entity, tamingComponent }: Props = $props();
    
   const pressFollowOption = (): void => {
      if (entity !== null) {
         sendAnimalStaffFollowCommandPacket(entity);
         createControlCommandParticles(AnimalStaffCommandType.follow);
      }
      entitySelectionState.setSelectedEntity(null);
   }

   const pressMoveOption = (): void => {
      if (entity !== null) {
         setShittyCarrier(entity);
         gameUIState.setGameInteractState(GameInteractState.selectMoveTargetPosition);
      }
   }

   const pressCarryOption = (): void => {
      if (entity !== null) {
         // @COPYNPASTE

         const rideableComponent = RideableComponentArray.getComponent(entity);

         let isCarrying = false;
         for (const carrySlot of rideableComponent.carrySlots) {
            if (entityExists(carrySlot.occupiedEntity)) {
               isCarrying = true;
               break;
            }
         }

         setShittyCarrier(entity);
         if (isCarrying) {
            gameUIState.setGameInteractState(GameInteractState.selectRiderDepositLocation);
         } else {
            gameUIState.setGameInteractState(GameInteractState.selectCarryTarget);
         }
      }
   }

   function pressAttackOption(): void {
      if (entity !== null) {
         setShittyCarrier(entity);
         gameUIState.setGameInteractState(GameInteractState.selectAttackTarget);
      }
   }
   
   const isCarrying = (): boolean => {
      const rideableComponent = RideableComponentArray.getComponent(entity);
      if (rideableComponent !== null) {
         for (const carrySlot of rideableComponent.carrySlots) {
            if (entityExists(carrySlot.occupiedEntity)) {
               return true;
            }
         }
      }
      return false;
   }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="animal-staff-options" style:--x="{entitySelectionState.selectedEntityScreenPosX}px" style:--y="{entitySelectionState.selectedEntityScreenPosY}px" oncontextmenu={preventDefault}>
   {#if hasTamingSkill(tamingComponent, TamingSkillID.follow)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option follow" class:active={tamingComponent.isFollowing} onclick={pressFollowOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.move)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option move" onclick={pressMoveOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.carry)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option carry" class:active={isCarrying()} onclick={pressCarryOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.attack)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option attack" onclick={pressAttackOption}></div>
   {/if}
</div>

<style>
#animal-staff-options {
   border: 4px solid #222;
   background-color: rgba(0, 0, 0, 0.5);
   position: absolute;
   z-index: 2;
   display: flex;
   transform: translate(-50%, -4rem) scale(var(--zoom));
   left: var(--x);
   bottom: var(--y);
}

#animal-staff-options .option {
   width: 68px;
   height: 68px;
   image-rendering: pixelated;
   background-size: 100% 100%;
   cursor: pointer;
   filter: grayscale(0.7) brightness(0.8);
}
#animal-staff-options .option:hover {
   filter: grayscale(0.7) brightness(1);
}
#animal-staff-options .option.active {
   filter: none;
}
#animal-staff-options .option.active:hover {
   filter: brightness(1.2);
}

#animal-staff-options .option:not(:last-child) {
   margin-right: 20px;
}

#animal-staff-options .follow {
   background-image: url(../../images/menus/animal-staff-options/follow.png);
}
#animal-staff-options .move {
   background-image: url(../../images/menus/animal-staff-options/move.png);
}
#animal-staff-options .carry {
   background-image: url(../../images/menus/animal-staff-options/carry.png);
}
#animal-staff-options .attack {
   background-image: url(../../images/menus/animal-staff-options/attack.png);
}
</style>