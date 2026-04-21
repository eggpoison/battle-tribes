import { randAngle, PacketReader, DoorToggleType, Entity, ServerComponentType } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { DOOR_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-register";

export interface DoorComponentData {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

class _DoorComponentArray extends ServerComponentArray<DoorComponent, DoorComponentData> {
   public decodeData(reader: PacketReader): DoorComponentData {
      const toggleType = reader.readNumber();
      const openProgress = reader.readNumber();
      return {
         toggleType: toggleType,
         openProgress: openProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material])
      );
      addRenderPartTag(renderPart, "buildingMaterialComponent:material");

      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(entityComponentData: EntityComponentData): DoorComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const doorComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.door);
      
      return {
         toggleType: doorComponentData.toggleType,
         openProgress: doorComponentData.openProgress
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: DoorComponentData, entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      const toggleType = data.toggleType;
      const openProgress = data.openProgress;
      
      const doorComponent = DoorComponentArray.getComponent(entity);
      if (toggleType === DoorToggleType.open && doorComponent.toggleType === DoorToggleType.none) {
         playSoundOnHitbox("door-open.mp3", 0.4, 1, entity, hitbox, false);
      } else if (toggleType === DoorToggleType.close && doorComponent.toggleType === DoorToggleType.none) {
         playSoundOnHitbox("door-close.mp3", 0.4, 1, entity, hitbox, false);
      }

      doorComponent.toggleType = toggleType;
      doorComponent.openProgress = openProgress;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, entity, hitbox, false);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
      }

      for (let i = 0; i < 7; i++) {
         const position = hitbox.box.position.offset(20, randAngle());
         createLightWoodSpeckParticle(position.x, position.y, 5);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, entity, hitbox, false);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
      }
   }
}

export const DoorComponentArray = registerServerComponentArray(ServerComponentType.door, _DoorComponentArray, true);

export function createDoorComponentData(): DoorComponentData {
   return {
      toggleType: DoorToggleType.none,
      openProgress: 0
   };
}