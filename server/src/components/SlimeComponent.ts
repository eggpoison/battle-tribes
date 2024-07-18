import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, SlimeSize } from "webgl-test-shared/dist/entities";
import { SLIME_MERGE_TIME, SLIME_MERGE_WEIGHTS, SLIME_RADII, SLIME_VISION_RANGES, SPIT_CHARGE_TIME_TICKS, SPIT_COOLDOWN_TICKS, SlimeEntityAnger } from "../entities/mobs/slime";
import Board from "../Board";
import { ComponentArray } from "./ComponentArray";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ComponentConfig } from "../components";
import { Packet } from "webgl-test-shared/dist/packets";

export interface SlimeComponentParams {
   size: SlimeSize;
   mergeWeight: number;
   orbSizes: Array<SlimeSize>;
}

const MAX_HEALTH: ReadonlyArray<number> = [10, 20, 35];

export class SlimeComponent {
   public readonly size: SlimeSize;

   /** The last tick that the slime spat at */
   public lastSpitTicks = 0;
   /** Progress in charging the spit attack in ticks */
   public spitChargeTicks = 0;
   
   public eyeRotation = 2 * Math.PI * Math.random();
   public mergeTimer = SLIME_MERGE_TIME;
   public mergeWeight: number;
   public lastMergeTicks: number;
   public readonly angeredEntities = new Array<SlimeEntityAnger>();

   public orbSizes: Array<SlimeSize>;

   constructor(params: SlimeComponentParams) {
      this.size = params.size;
      this.mergeWeight = params.mergeWeight;
      this.orbSizes = params.orbSizes;
      this.lastMergeTicks = Board.ticks;
   }
}

export const SlimeComponentArray = new ComponentArray<SlimeComponent>(ServerComponentType.slime, true, {
   onInitialise: onInitialise,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.health | ServerComponentType.aiHelper | ServerComponentType.slime>): void {
   const size = config[ServerComponentType.slime].size;

   const hitbox = config[ServerComponentType.transform].hitboxes[0] as CircularHitbox;
   hitbox.mass = 1 + size * 0.5;
   hitbox.radius = SLIME_RADII[size];

   config[ServerComponentType.health].maxHealth = MAX_HEALTH[size];
   config[ServerComponentType.aiHelper].visionRange = SLIME_VISION_RANGES[size];
   config[ServerComponentType.slime].mergeWeight = SLIME_MERGE_WEIGHTS[size];
}

function getDataLength(entity: EntityID): number {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT * slimeComponent.orbSizes.length;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   packet.addNumber(slimeComponent.size);
   packet.addNumber(slimeComponent.eyeRotation);

   packet.addNumber(slimeComponent.orbSizes.length);
   for (let i = 0; i < slimeComponent.orbSizes.length; i++) {
      const orbSize = slimeComponent.orbSizes[i];
      packet.addNumber(orbSize);
   }
   
   let anger = -1;
   if (slimeComponent.angeredEntities.length > 0) {
      // Find maximum anger
      for (const angerInfo of slimeComponent.angeredEntities) {
         if (angerInfo.angerAmount > anger) {
            anger = angerInfo.angerAmount;
         }
      }
   }

   packet.addNumber(anger);

   const spitChargeProgress = slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS ? (slimeComponent.spitChargeTicks - SPIT_COOLDOWN_TICKS) / (SPIT_CHARGE_TIME_TICKS - SPIT_COOLDOWN_TICKS) : -1;
   packet.addNumber(spitChargeProgress);
}