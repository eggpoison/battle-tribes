import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { playSound, AudioFilePath } from "../sound";
import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class ZombieComponent extends ServerComponent {
   public zombieType = 0;

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.zombieType = reader.readNumber();
   }
}

export default ZombieComponent;

export const ZombieComponentArray = new ComponentArray<ZombieComponent>(ComponentArrayType.server, ServerComponentType.zombie, true, {
   onTick: onTick
});

function onTick(zombieComponent: ZombieComponent): void {
   if (Math.random() < 0.1 / Settings.TPS) {
      const transformComponent = zombieComponent.entity.getServerComponent(ServerComponentType.transform);
      playSound(("zombie-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }
}