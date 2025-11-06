import { Entity } from "webgl-test-shared";
import { TransformComponentArray } from "../game/entity-components/server-components/TransformComponent";
import { worldToScreenPos } from "../game/camera";
import { entityExists } from "../game/world";

export enum OptionType {
   placeBlueprint,
   modify,
   deconstruct
}

let entity = $state<Entity>(0);
let x = $state(0);
let y = $state(0);

export const buildMenuState = {
   get entity() {
      return entity;
   },
   setEntity(newEntity: Entity): void {
      entity = newEntity;
   },

   getX() {
      return x;
   },
   getY() {
      return y;
   },

   updateEntity(entity?: Entity): void {
      if (typeof entity === "undefined" || !entityExists(entity)) {
         entity = 0;
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(entity);

      const hitbox = transformComponent.hitboxes[0];

      const screenPos = worldToScreenPos(hitbox.box.position);
      x = screenPos.x;
      y = screenPos.y;
   }
};