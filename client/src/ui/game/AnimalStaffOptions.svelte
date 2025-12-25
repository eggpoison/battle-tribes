<script lang="ts">
   import { type Entity, TamingSkillID } from "webgl-test-shared";
   import { sendAnimalStaffFollowCommandPacket } from "../../game/networking/packet-sending";
   import { entityExists } from "../../game/world";
   import { hasTamingSkill, TamingComponentArray } from "../../game/entity-components/server-components/TamingComponent";
   import { RideableComponentArray } from "../../game/entity-components/server-components/RideableComponent";
   import { preventDefault } from "../ui-utils.svelte";
   import { AnimalStaffCommandType, createControlCommandParticles } from "../../game/particles";
   import { entitySelectionState } from "../../ui-state/entity-selection-state.svelte";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import { setShittyCarrier } from "../../game/player-action-handler";

   interface Props {
      entity: Entity;
   } 
    
   let { entity }: Props = $props();
    
   const tamingComponent = $derived(TamingComponentArray.getComponent(entity));

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
<div id="animal-staff-options" style:left="{entitySelectionState.selectedEntityX}px" style:top="{entitySelectionState.selectedEntityY}px" oncontextmenu={preventDefault}>
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