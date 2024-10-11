import { EntityID, SnowballSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { randFloat, randSign } from "battletribes-shared/utils";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { Settings } from "battletribes-shared/settings";

export class SnowballComponent {
   public readonly yeti: EntityID;
   public readonly size: SnowballSize;
   public readonly lifetimeTicks = Math.floor(randFloat(10, 15) * Settings.TPS);

   constructor(yeti: EntityID, size: SnowballSize) {
      this.yeti = yeti;
      this.size = size;
   }
}

export const SnowballComponentArray = new ComponentArray<SnowballComponent>(ServerComponentType.snowball, true, {
   onJoin: onJoin,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onJoin(entity: EntityID): void {
   /** Set the snowball to spin */
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.angularVelocity = randFloat(1, 2) * Math.PI * randSign();
}

function onTick(snowballComponent: SnowballComponent, snowball: EntityID): void {
   const ageTicks = getEntityAgeTicks(snowball);
   
   // @Incomplete. we use physics component angular velocity now, but that doesn't decrease over time!
   // Angular velocity
   // if (snowballComponent.angularVelocity !== 0) {
   //    snowball.rotation += snowballComponent.angularVelocity / Settings.TPS;

   //    const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
   //    physicsComponent.hitboxesAreDirty = true;
      
   //    const beforeSign = Math.sign(snowballComponent.angularVelocity);
   //    snowballComponent.angularVelocity -= Math.PI / Settings.TPS * beforeSign;
   //    if (beforeSign !== Math.sign(snowballComponent.angularVelocity)) {
   //       snowballComponent.angularVelocity = 0;
   //    }
   // }

   if (ageTicks >= snowballComponent.lifetimeTicks) {
      destroyEntity(snowball);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   packet.addNumber(snowballComponent.size);
}