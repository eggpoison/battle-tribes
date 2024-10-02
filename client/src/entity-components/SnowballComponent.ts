import { SnowballSize } from "battletribes-shared/entities";
import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import Board from "../Board";
import { createSnowParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class SnowballComponent extends ServerComponent {
   public size: SnowballSize = 0;
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.size = reader.readNumber();
   }
}

export default SnowballComponent;

export const SnowballComponentArray = new ComponentArray<SnowballComponent>(ComponentArrayType.server, ServerComponentType.snowball, true, {
   onTick: onTick
});
   
function onTick(snowballComponent: SnowballComponent): void {
   const transformComponent = snowballComponent.entity.getServerComponent(ServerComponentType.transform);
   const physicsComponent = snowballComponent.entity.getServerComponent(ServerComponentType.physics);
   if ((physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) && physicsComponent.selfVelocity.lengthSquared() > 2500) {
      if (Board.tickIntervalHasPassed(0.05)) {
         createSnowParticle(transformComponent.position.x, transformComponent.position.y, randFloat(40, 60));
      }
   }
}