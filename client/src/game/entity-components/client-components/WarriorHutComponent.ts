import { Entity, ServerComponentType } from "webgl-test-shared";
import { Hitbox } from "../../hitboxes";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface WarriorHutComponentData {}

interface IntermediateInfo {}

export interface WarriorHutComponent {}

export const WarriorHutComponentArray = new ClientComponentArray<WarriorHutComponent, IntermediateInfo>(ClientComponentType.warriorHut, true, createComponent, getMaxRenderParts);
WarriorHutComponentArray.populateIntermediateInfo = populateIntermediateInfo;
WarriorHutComponentArray.onHit = onHit;
WarriorHutComponentArray.onDie = onDie;

export function createWarriorHutComponentData(): WarriorHutComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
   );
   renderInfo.attachRenderPart(hutRenderPart);

   // Doors
   const doorRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         hutRenderPart,
         1,
         0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
      );
      doorRenderPart.addTag("hutComponent:door");
      renderInfo.attachRenderPart(doorRenderPart);
      doorRenderParts.push(doorRenderPart);
   }

   return {};
}

function createComponent(): WarriorHutComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}