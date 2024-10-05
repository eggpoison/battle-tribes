import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { destroyEntity } from "../world";

const enum Vars {
   BREAK_VELOCITY = 100
}

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function onTick(_slimeSpitComponent: SlimeSpitComponent, spit: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spit);

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   if (vx * vx + vy * vy <= Vars.BREAK_VELOCITY * Vars.BREAK_VELOCITY) {
      destroyEntity(spit);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}