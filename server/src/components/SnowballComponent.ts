import { EntityID, SNOWBALL_SIZES, SnowballSize } from "webgl-test-shared/dist/entities";
import { ServerComponentType, SnowballComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { randFloat, randSign } from "webgl-test-shared/dist/utils";
import { Packet } from "webgl-test-shared/dist/packets";

export interface SnowballComponentParams {
   yetiID: number;
   size: SnowballSize;
   readonly lifetime: number;
}

const MAX_HEALTHS: ReadonlyArray<number> = [1, 3];

export class SnowballComponent {
   public readonly yetiID: number;
   public readonly size: SnowballSize;
   public readonly lifetimeTicks: number;

   constructor(params: SnowballComponentParams) {
      this.yetiID = params.yetiID;
      this.size = params.size;
      this.lifetimeTicks = params.lifetime;
   }
}

export const SnowballComponentArray = new ComponentArray<SnowballComponent>(ServerComponentType.snowball, true, {
   onJoin: onJoin,
   onInitialise: onInitialise,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onJoin(entity: EntityID): void {
   /** Set the snowball to spin */
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.angularVelocity = randFloat(1, 2) * Math.PI * randSign();
}

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.health | ServerComponentType.snowball>): void {
   const size = config[ServerComponentType.snowball].size;

   config[ServerComponentType.health].maxHealth = MAX_HEALTHS[size];
   
   const hitbox = config[ServerComponentType.transform].hitboxes[0] as CircularHitbox;
   hitbox.mass = size === SnowballSize.small ? 1 : 1.5;
   hitbox.radius = SNOWBALL_SIZES[size] / 2;
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   packet.addNumber(snowballComponent.size);
}