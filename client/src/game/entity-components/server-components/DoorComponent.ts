import { ServerComponentType } from "../../../../../shared/src/components";
import { DoorToggleType, Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Point, randAngle } from "../../../../../shared/src/utils";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { DOOR_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface DoorComponentData {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.door, typeof DoorComponentArray> {}
}

export const DoorComponentArray = registerServerComponentArray(
   ServerComponentType.door,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
DoorComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DoorComponentArray.updateFromData = updateFromData;
DoorComponentArray.onHit = onHit;
DoorComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): DoorComponentData {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   return {
      toggleType: toggleType,
      openProgress: openProgress
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material]
   );
   addRenderPartTag(renderPart, "buildingMaterialComponent:material");

   renderObject.attachRenderPart(renderPart);
}

function createComponent(entityComponentData: EntityComponentData): DoorComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const doorComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.door);
   
   return {
      toggleType: doorComponentData.toggleType,
      openProgress: doorComponentData.openProgress
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: DoorComponentData, entity: Entity): void {
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

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, entity, hitbox, false);

   for (let i = 0; i < 4; i++) {
      createLightWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 20);
   }

   for (let i = 0; i < 7; i++) {
      const position = new Point(hitbox.box.posX, hitbox.box.posY).offset(20, randAngle());
      createLightWoodSpeckParticle(position.x, position.y, 5);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, entity, hitbox, false);

   for (let i = 0; i < 7; i++) {
      createLightWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 32 * Math.random());
   }

   for (let i = 0; i < 3; i++) {
      createWoodShardParticle(hitbox.box.posX, hitbox.box.posY, 32);
   }
}

export function createDoorComponentData(): DoorComponentData {
   return {
      toggleType: DoorToggleType.none,
      openProgress: 0
   };
}