import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { LayeredRodComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Settings } from "webgl-test-shared/dist/settings";

const enum Vars {
   NATURAL_DRIFT = 0.6 / Settings.TPS
}

export interface LayeredRodComponentParams {}

const MAX_BEND = 6;

export class LayeredRodComponent {
   public readonly numLayers = randInt(2, 5);
   public readonly naturalBend = Point.fromVectorForm(randFloat(2, 4), 2 * Math.PI * Math.random());
   public readonly colour = {
      r: randFloat(0.4, 0.5),
      g: randFloat(0.9, 1),
      b: randFloat(0.2, 0.3)
   };

   public bendX = 0;
   public bendY = 0;
}

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ServerComponentType.layeredRod, true, {
   onTick: onTick,
   onCollision: onCollision,
   serialise: serialise
});

const bendToPushAmount = (bend: number): number => {
   return bend - 1 / (bend - MAX_BEND) - 1 / MAX_BEND;
}

const pushAmountToBend = (pushAmount: number): number => {
   let bend = pushAmount + 1 / MAX_BEND - MAX_BEND - Math.sqrt(Math.pow(pushAmount + 1 / MAX_BEND - MAX_BEND, 2) + 4);
   bend /= 2;
   bend += MAX_BEND;
   return bend;
}

function onTick(_entity: EntityID, layeredRodComponent: LayeredRodComponent): void {
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);

   if (bendMagnitude > Vars.NATURAL_DRIFT) {
      layeredRodComponent.bendX -= Vars.NATURAL_DRIFT * layeredRodComponent.bendX / bendMagnitude;
      layeredRodComponent.bendY -= Vars.NATURAL_DRIFT * layeredRodComponent.bendY / bendMagnitude;
   } else {
      layeredRodComponent.bendX = 0;
      layeredRodComponent.bendY = 0;
   }
}

function onCollision(entity: EntityID, _collidingEntity: EntityID, _pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);

   const distance = transformComponent.position.calculateDistanceBetween(pushingHitbox.position);
   const directionFromCollidingEntity = pushingHitbox.position.calculateAngleBetween(transformComponent.position);

   let existingPushX = bendToPushAmount(layeredRodComponent.bendX);
   let existingPushY = bendToPushAmount(layeredRodComponent.bendY);
   
   let pushAmount = 400 / Settings.TPS / (distance + 0.5);
   pushAmount *= pushingHitbox.mass;
   
   // Restrict the bend from going past the max bend
   const currentBend = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
   pushAmount *= Math.pow((MAX_BEND - currentBend) / MAX_BEND, 0.5);

   existingPushX += pushAmount * Math.sin(directionFromCollidingEntity);
   existingPushY += pushAmount * Math.cos(directionFromCollidingEntity);

   const bendX = pushAmountToBend(existingPushX);
   const bendY = pushAmountToBend(existingPushY);

   // @Hack
   if (Math.sqrt(bendX * bendX + bendY * bendY) >= MAX_BEND) {
      return;
   }

   layeredRodComponent.bendX = bendX;
   layeredRodComponent.bendY = bendY;
}

function serialise(entity: EntityID): LayeredRodComponentData {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   
   return {
      componentType: ServerComponentType.layeredRod,
      numLayers: layeredRodComponent.numLayers,
      bend: [layeredRodComponent.naturalBend.x + layeredRodComponent.bendX, layeredRodComponent.naturalBend.y + layeredRodComponent.bendY],
      colour: layeredRodComponent.colour
   };
}