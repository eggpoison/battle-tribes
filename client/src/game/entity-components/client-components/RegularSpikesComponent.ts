import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType, Entity } from "../../../../../shared/src/entities";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { WALL_SPIKE_TEXTURE_SOURCES, FLOOR_SPIKE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";

export interface RegularSpikesComponentData {}

export interface RegularSpikesComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.regularSpikes, typeof RegularSpikesComponentArray> {}
}

export const RegularSpikesComponentArray = registerClientComponentArray(
   ClientComponentType.regularSpikes,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
RegularSpikesComponentArray.populateIntermediateInfo = populateIntermediateInfo;
RegularSpikesComponentArray.onHit = onHit;
RegularSpikesComponentArray.onDie = onDie;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const materialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

   const isAttachedToWall = entityComponentData.entityType === EntityType.wallSpikes;
   let textureIndex: number;
   if (isAttachedToWall) {
      textureIndex = WALL_SPIKE_TEXTURE_SOURCES[materialComponentData.material];
   } else {
      textureIndex = FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentData.material];
   }

   const mainRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      textureIndex
   )
   addRenderPartTag(mainRenderPart, "buildingMaterialComponent:material");

   renderObject.attachRenderPart(mainRenderPart);
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

export function createRegularSpikesComponentData(): RegularSpikesComponentData {
   return {};
}