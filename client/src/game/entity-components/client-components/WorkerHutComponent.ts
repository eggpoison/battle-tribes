import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WorkerHutComponentData {}

interface IntermediateInfo {}

export interface WorkerHutComponent {}

export const WorkerHutComponentArray = new ClientComponentArray<WorkerHutComponent, IntermediateInfo>(ClientComponentType.workerHut, true, createComponent, getMaxRenderParts);
WorkerHutComponentArray.populateIntermediateInfo = populateIntermediateInfo;
WorkerHutComponentArray.onHit = onHit;
WorkerHutComponentArray.onDie = onDie;

export function createWorkerHutComponentData(): WorkerHutComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut.png")
   );
   renderInfo.attachRenderPart(hutRenderPart);

   // Door
   const doorRenderPart = new TexturedRenderPart(
      hutRenderPart,
      1,
      0,
      getTextureArrayIndex("entities/worker-hut/worker-hut-door.png")
   );
   doorRenderPart.addTag("hutComponent:door");
   renderInfo.attachRenderPart(doorRenderPart);

   return {};
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