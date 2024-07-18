import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

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

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.addNumber(slimeSpitComponent.size);
}