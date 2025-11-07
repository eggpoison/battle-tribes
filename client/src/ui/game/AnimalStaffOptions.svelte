<script lang="ts">
   import { TamingSkillID, type Entity } from "webgl-test-shared";
   import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
   import { sendAnimalStaffFollowCommandPacket } from "../../game/networking/packet-sending";
   import { entityExists } from "../../game/world";
   import { hasTamingSkill, TamingComponentArray } from "../../game/entity-components/server-components/TamingComponent";
   import { RideableComponentArray } from "../../game/entity-components/server-components/RideableComponent";
   import { worldToScreenPos } from "../../game/camera";
   import { preventDefault } from "../ui-utils.svelte";
   import { AnimalStaffCommandType, createControlCommandParticles } from "../../game/particles";
   import { entityInteractionState } from "../../ui-state/entity-interaction-state.svelte";

   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [isHovering, setIsHovering] = useState(false);

   // @Hack: "!"
   const entity = entityInteractionState.selectedEntity!;

   const tamingComponent = TamingComponentArray.getComponent(entity);
   const followOptionIsSelected = tamingComponent.isFollowing;

   const updateFromEntity = (entity: Entity): void => {
      const transformComponent = TransformComponentArray.getComponent(entity);
      if (transformComponent === null) {
         return;
      }

      const hitbox = transformComponent.hitboxes[0];

      const screenPos = worldToScreenPos(hitbox.box.position);
      setX(screenPos.x);
      setY(screenPos.y);

   }

   const pressFollowOption = useCallback((): void => {
      if (entity !== null) {
         sendAnimalStaffFollowCommandPacket(entity);
         createControlCommandParticles(AnimalStaffCommandType.follow);
      }
      entityInteractionState.setSelectedEntity(null);
   }, [entity]);

   const pressMoveOption = useCallback((): void => {
      if (entity !== null) {
         setShittyCarrier(entity);
         props.setGameInteractState(GameInteractState.selectMoveTargetPosition);
      }
   }, [entity]);

   const pressCarryOption = useCallback((): void => {
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
            props.setGameInteractState(GameInteractState.selectRiderDepositLocation);
         } else {
            props.setGameInteractState(GameInteractState.selectCarryTarget);
         }
      }
   }, [entity]);

   function pressAttackOption(): void {
      if (entity !== null) {
         setShittyCarrier(entity);
         props.setGameInteractState(GameInteractState.selectAttackTarget);
      }
   }
   
   
   let isCarrying = false;
   const rideableComponent = RideableComponentArray.getComponent(entity);
   if (rideableComponent !== null) {
      for (const carrySlot of rideableComponent.carrySlots) {
         if (entityExists(carrySlot.occupiedEntity)) {
            isCarrying = true;
            break;
         }
      }
   }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="animal-staff-options" style:left="{x}px" style:bottom="{y}px" oncontextmenu={preventDefault}>
   {#if hasTamingSkill(tamingComponent, TamingSkillID.follow)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option follow" class:active={followOptionIsSelected} onclick={pressFollowOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.move)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option move" onclick={pressMoveOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.carry)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option carry" class:active={isCarrying} onclick={pressCarryOption}></div>
   {/if}
   {#if hasTamingSkill(tamingComponent, TamingSkillID.attack)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="option attack" onclick={pressAttackOption}></div>
   {/if}
</div>