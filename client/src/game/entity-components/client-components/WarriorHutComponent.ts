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
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      0, 0,
      getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
   );
   renderObject.attachRenderPart(hutRenderPart);

   // Doors
   const doorRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         hutRenderPart,
         1,
         0,
         0, 0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
      );
      addRenderPartTag(doorRenderPart, "hutComponent:door");
      renderObject.attachRenderPart(doorRenderPart);
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