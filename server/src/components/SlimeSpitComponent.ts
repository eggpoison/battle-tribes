import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";
import { PhysicsComponentArray } from "./PhysicsComponent";
import Board from "../Board";

const enum Vars {
   BREAK_VELOCITY = 100
}

export interface SlimeSpitComponentParams {
   size: number;
}

const SIZES = [20, 30];

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(params: SlimeSpitComponentParams) {
      this.size = params.size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, {
   onInitialise: onInitialise,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.slimeSpit>): void {
   const size = config[ServerComponentType.slimeSpit].size;

   const hitboxSize = SIZES[size];
   const hitbox = config[ServerComponentType.transform].hitboxes[0] as RectangularHitbox;
   hitbox.width = hitboxSize;
   hitbox.height = hitboxSize;
}

export function onTick(_slimeSpitComponent: SlimeSpitComponent, spit: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spit);
   if (physicsComponent.velocity.lengthSquared() <= Vars.BREAK_VELOCITY * Vars.BREAK_VELOCITY) {
      Board.destroyEntity(spit);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}