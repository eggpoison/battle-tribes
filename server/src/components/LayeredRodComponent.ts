import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Settings } from "webgl-test-shared/dist/settings";
import { Packet } from "webgl-test-shared/dist/packets";

const enum Vars {
   // NATURAL_DRIFT = 0.6 / Settings.TPS
   NATURAL_DRIFT = 37 / Settings.TPS
}

export interface LayeredRodComponentParams {}

const MAX_BEND = 6;

export class LayeredRodComponent {
   public readonly numLayers = randInt(2, 5);
   public readonly naturalBend = Point.fromVectorForm(randFloat(2, 4), 2 * Math.PI * Math.random());
   public readonly colour = {
      r: randFloat(0.4, 0.5),
      g: randFloat(0.8, 0.95),
      b: randFloat(0.2, 0.3)
   };

   public bendX = 0;
   public bendY = 0;
}

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ServerComponentType.layeredRod, true, {
   onTick: onTick,
   onCollision: onCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
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
   
   // let pushAmount = 400 / Settings.TPS / (distance + 0.5);
   let pushAmount = 1000 / Settings.TPS / (distance + 0.5);
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

function getDataLength(): number {
   return 7 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   
   // Num layers
   packet.addNumber(layeredRodComponent.numLayers);
   // BendX
   packet.addNumber(layeredRodComponent.naturalBend.x + layeredRodComponent.bendX);
   // BendY
   packet.addNumber(layeredRodComponent.naturalBend.y + layeredRodComponent.bendY);
   // Colour R
   packet.addNumber(layeredRodComponent.colour.r);
   // Colour G
   packet.addNumber(layeredRodComponent.colour.g);
   // Colour B
   packet.addNumber(layeredRodComponent.colour.b);
}