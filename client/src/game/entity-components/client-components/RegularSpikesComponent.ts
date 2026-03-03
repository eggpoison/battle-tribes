import { Entity, EntityType, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { WALL_SPIKE_TEXTURE_SOURCES, FLOOR_SPIKE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface RegularSpikesComponentData {}

interface IntermediateInfo {}

export interface RegularSpikesComponent {}

export const RegularSpikesComponentArray = new ClientComponentArray<RegularSpikesComponent, IntermediateInfo>(ClientComponentType.regularSpikes, true, createComponent, getMaxRenderParts);
RegularSpikesComponentArray.populateIntermediateInfo = populateIntermediateInfo;
RegularSpikesComponentArray.onHit = onHit;
RegularSpikesComponentArray.onDie = onDie;

export function createRegularSpikesComponentData(): RegularSpikesComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];

   const materialComponentData = entityComponentData.serverComponentData.get(ServerComponentType.buildingMaterial)!;

   const isAttachedToWall = entityComponentData.entityType === EntityType.wallSpikes;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
   } else {
      textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
   }

   const mainRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      textureArrayIndex
   )
   mainRenderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderPart(mainRenderPart);

   return {};
}

function createComponent(): RegularSpikesComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("wooden-spikes-hit.mp3", 0.2, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}