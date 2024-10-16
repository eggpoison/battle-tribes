import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { playSound } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

class ZombieComponent {
   public zombieType = 0;
}

export default ZombieComponent;

export const ZombieComponentArray = new ServerComponentArray<ZombieComponent>(ServerComponentType.zombie, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(_zombieComponent: ZombieComponent, entity: EntityID): void {
   if (Math.random() < 0.1 / Settings.TPS) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound("zombie-ambient-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(entity);
   zombieComponent.zombieType = reader.readNumber();
}