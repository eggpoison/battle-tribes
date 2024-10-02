import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

const enum Vars {
   LIMB_ORBIT_RADIUS = 60
}

export interface GuardianComponentParams {}

export class GuardianComponent implements GuardianComponentParams {
   public limbHitboxes = new Array<Hitbox>();
}

export const GuardianComponentArray = new ComponentArray<GuardianComponent>(ServerComponentType.guardian, true, {
   onJoin: onJoin,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function getGuardianLimbOrbitRadius(): number {
   return Vars.LIMB_ORBIT_RADIUS;
}

function onJoin(guardian: EntityID): void {

}

function onTick(guardianComponent: GuardianComponent, guardian: EntityID): void {

}

function getDataLength(): number {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {}