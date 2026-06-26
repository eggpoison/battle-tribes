import { Entity } from "../../../../../shared/src/entities";
import { Hitbox } from "../../hitboxes";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface WarriorHutComponentData {}

export interface WarriorHutComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.warriorHut, typeof WarriorHutComponentArray> {}
}

export const WarriorHutComponentArray = registerClientComponentArray(
   ClientComponentType.warriorHut,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
WarriorHutComponentArray.populateIntermediateInfo = populateIntermediateInfo;
WarriorHutComponentArray.onHit = onHit;
WarriorHutComponentArray.onDie = onDie;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Hut
   const hutRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      0, 0,
      TextureIndex.entities_warriorHut_warriorHut
   );
   renderObject.attachRenderPart(hutRenderPart);

   // Doors
   const doorRenderParts: VisualRenderPart[] = [];
   for (let i = 0; i < 2; i++) {
      const doorRenderPart = new TexturedRenderPart(
         hutRenderPart,
         1,
         0,
         0, 0,
         TextureIndex.entities_warriorHut_warriorHutDoor
      );
      addRenderPartTag(doorRenderPart, "hutComponent:door");
      renderObject.attachRenderPart(doorRenderPart);
      doorRenderParts.push(doorRenderPart);
   }
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

export function createWarriorHutComponentData(): WarriorHutComponentData {
   return {};
}