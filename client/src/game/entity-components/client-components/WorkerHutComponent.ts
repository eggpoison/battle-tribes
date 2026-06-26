import { Entity } from "../../../../../shared/src/entities";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface WorkerHutComponentData {}

export interface WorkerHutComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.workerHut, typeof WorkerHutComponentArray> {}
}

export const WorkerHutComponentArray = registerClientComponentArray(
   ClientComponentType.workerHut,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
WorkerHutComponentArray.populateIntermediateInfo = populateIntermediateInfo;
WorkerHutComponentArray.onHit = onHit;
WorkerHutComponentArray.onDie = onDie;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      0, 0,
      TextureIndex.entities_workerHut_workerHut
   );
   renderObject.attachRenderPart(hutRenderPart);

   // Door
   const doorRenderPart = new TexturedRenderPart(
      hutRenderPart,
      1,
      0,
      0, 0,
      TextureIndex.entities_workerHut_workerHutDoor
   );
   addRenderPartTag(doorRenderPart, "hutComponent:door");
   renderObject.attachRenderPart(doorRenderPart);
}

function createComponent(): WorkerHutComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}

export function createWorkerHutComponentData(): WorkerHutComponentData {
   return {};
}