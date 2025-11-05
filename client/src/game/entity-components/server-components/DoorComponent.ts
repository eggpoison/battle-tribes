import { ServerComponentType } from "webgl-test-shared/src/components";
import { DoorToggleType, Entity } from "webgl-test-shared/src/entities";
import { playSoundOnHitbox } from "../../sound";
import { PacketReader } from "webgl-test-shared/src/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { DOOR_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { randAngle } from "../../../../../shared/src/utils";

export interface DoorComponentData {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

interface IntermediateInfo {}

export interface DoorComponent {
   toggleType: DoorToggleType;
   openProgress: number;
}

export const DoorComponentArray = new ServerComponentArray<DoorComponent, DoorComponentData, IntermediateInfo>(ServerComponentType.door, true, createComponent, getMaxRenderParts, decodeData);
DoorComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DoorComponentArray.updateFromData = updateFromData;
DoorComponentArray.onHit = onHit;
DoorComponentArray.onDie = onDie;

export function createDoorComponentData(): DoorComponentData {
   return {
      toggleType: DoorToggleType.none,
      openProgress: 0
   };
}

function decodeData(reader: PacketReader): DoorComponentData {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   return {
      toggleType: toggleType,
      openProgress: openProgress
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const buildingMaterialComponentData = entityComponentData.serverComponentData[ServerComponentType.buildingMaterial]!;

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): DoorComponent {
   const doorComponentData = entityComponentData.serverComponentData[ServerComponentType.door]!;
   
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
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   }

   for (let i = 0; i < 7; i++) {
      const position = hitbox.box.position.offset(20, randAngle());
      createLightWoodSpeckParticle(position.x, position.y, 5);
   }
}

function onDie(entity: Entity): void {
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