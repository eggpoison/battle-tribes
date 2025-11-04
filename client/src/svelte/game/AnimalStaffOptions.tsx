import { useCallback, useEffect, useState } from "react";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
import { sendAnimalStaffFollowCommandPacket } from "../../game/networking/packet-sending";
import { deselectSelectedEntity } from "../../game/entity-selection";
import { InventoryUseComponentArray } from "../../game/entity-components/server-components/InventoryUseComponent";
import { entityExists } from "../../game/world";
import { createAnimalStaffCommandParticle } from "../../game/particles";
import { getMatrixPosition } from "../../game/rendering/render-part-matrices";
import { createTranslationMatrix, matrixMultiplyInPlace } from "../../game/rendering/matrices";
import { playHeadSound } from "../../game/sound";
import { GameInteractState } from "./GameScreen";
import { playerInstance } from "../../game/player";
import { hasTamingSkill, TamingComponentArray } from "../../game/entity-components/server-components/TamingComponent";
import { setShittyCarrier } from "./GameInteractableLayer";
import { TamingSkillID } from "../../../../shared/src/taming";
import { RideableComponentArray } from "../../game/entity-components/server-components/RideableComponent";
import { worldToScreenPos } from "../../game/camera";

export const enum AnimalStaffCommandType {
   follow,
   move,
   carry,
   attack
}

export interface AnimalStaffOptionsProps {
   setGameInteractState(state: GameInteractState): void;
}

// @Cleanup: a lot of this is similar to BuildMenu

export let AnimalStaffOptions_setIsVisible: (isVisible: boolean) => void = () => {};
export let AnimalStaffOptions_isHovering: () => boolean = () => false;
export let AnimalStaffOptions_setEntity: (entity: Entity | null) => void = () => {};
export let AnimalStaffOptions_update: () => void = () => {};

export function createControlCommandParticles(commandType: AnimalStaffCommandType): void {
   if (playerInstance === null) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
   if (inventoryUseComponent === null) {
      return;
   }

   const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[0];

   const originMatrix = createTranslationMatrix(14, 14);
   matrixMultiplyInPlace(activeItemRenderPart.modelMatrix, originMatrix);
   const origin = getMatrixPosition(originMatrix);

   let r: number;
   let g: number;
   let b: number;
   switch (commandType) {
      case AnimalStaffCommandType.follow: {
         r = 165/255;
         g = 255/255;
         b = 163/255;
         break;
      }
      case AnimalStaffCommandType.move: {
         r = 65/255;
         g = 238/255;
         b = 240/255;
         break;
      }
      case AnimalStaffCommandType.carry: {
         r = 237/255;
         g = 172/255;
         b = 19/255;
         break;
      }
      case AnimalStaffCommandType.attack: {
         r = 237/255;
         g = 0/255;
         b = 0/255;
         break;
      }
   }

   const n = 20;
   for (let i = 0; i < n; i++) {
      const offsetDirection = 2 * Math.PI * i / n;
      const offsetMagnitude = 15;
      const x = origin.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = origin.y + offsetMagnitude * Math.cos(offsetDirection);
      createAnimalStaffCommandParticle(x, y, offsetDirection, r, g, b);
   }

   let soundFile: string;
   switch (commandType) {
      case AnimalStaffCommandType.follow: {
         soundFile = "animal-staff-command-follow.mp3";
         break;
      }
      case AnimalStaffCommandType.move: {
         soundFile = "animal-staff-command-move.mp3";
         break;
      }
      case AnimalStaffCommandType.carry: {
         soundFile = "animal-staff-command-carry.mp3";
         break;
      }
      case AnimalStaffCommandType.attack: {
         soundFile = "animal-staff-command-attack.mp3";
         break;
      }
   }
   playHeadSound(soundFile, 1.3, 1);
}

const AnimalStaffOptions = (props: AnimalStaffOptionsProps) => {
   const [isVisible, setIsVisible] = useState(false);
   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [followOptionIsSelected, setFollowOptionIsSelected] = useState(false);
   const [isHovering, setIsHovering] = useState(false);

   const updateFromEntity = (entity: Entity): void => {
      const transformComponent = TransformComponentArray.getComponent(entity);
      if (transformComponent === null) {
         return;
      }

      const hitbox = transformComponent.hitboxes[0];

      const screenPos = worldToScreenPos(hitbox.box.position);
      setX(screenPos.x);
      setY(screenPos.y);

      const tamingComponent = TamingComponentArray.getComponent(entity);
      if (tamingComponent !== null) {
         setFollowOptionIsSelected(tamingComponent.isFollowing);
      }
   }
   
   useEffect(() => {
      AnimalStaffOptions_setIsVisible = setIsVisible;
      AnimalStaffOptions_setEntity = (entity: Entity | null) => {
         setEntity(entity);

         if (entity !== null) {
            updateFromEntity(entity);
         }
      }
   }, []);

   useEffect(() => {
      AnimalStaffOptions_isHovering = () => isHovering;
   }, [isHovering]);

   useEffect(() => {
      AnimalStaffOptions_update = (): void => {
         if (entity !== null) {
            if (!entityExists(entity)) {
               setEntity(null); 
            } else {
               updateFromEntity(entity);
            }
         }
      }
   }, [entity]);

   const onMouseOver = () => {
      setIsHovering(true);
   }

   const onMouseMove = () => {
      setIsHovering(true);
   }

   const onMouseOut = () => {
      setIsHovering(false);
   }

   const pressFollowOption = useCallback((): void => {
      if (entity !== null) {
         sendAnimalStaffFollowCommandPacket(entity);
         createControlCommandParticles(AnimalStaffCommandType.follow);
      }
      deselectSelectedEntity();
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
         if (rideableComponent === null) {
            return;
         }

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

   const pressAttackOption = useCallback((): void => {
      if (entity !== null) {
         setShittyCarrier(entity);
         props.setGameInteractState(GameInteractState.selectAttackTarget);
      }
   }, [entity]);
   
   if (!isVisible || entity === null || !entityExists(entity)) {
      return null;
   }

   const tamingComponent = TamingComponentArray.getComponent(entity);
   if (tamingComponent === null) {
      return null;
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

   return <div id="animal-staff-options" style={{left: x + "px", bottom: y + "px"}} onContextMenu={e => e.preventDefault()} onMouseOver={onMouseOver} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
      {hasTamingSkill(tamingComponent, TamingSkillID.follow) ? (
         <div className={`option follow${followOptionIsSelected ? " active" : ""}`} onClick={pressFollowOption}></div>
      ) : null}
      {hasTamingSkill(tamingComponent, TamingSkillID.move) ? (
         <div className="option move" onClick={pressMoveOption}></div>
      ) : null}
      {hasTamingSkill(tamingComponent, TamingSkillID.carry) ? (
         <div className={`option carry${isCarrying ? " active" : ""}`} onClick={pressCarryOption}></div>
      ) : null}
      {hasTamingSkill(tamingComponent, TamingSkillID.attack) ? (
         <div className="option attack" onClick={pressAttackOption}></div>
      ) : null}
   </div>;
}

export default AnimalStaffOptions;