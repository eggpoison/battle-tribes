import { EntityID, SnowballSize } from "battletribes-shared/entities";
import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import Board from "../../Board";
import { createSnowParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import ServerComponentArray from "../ServerComponentArray";

class SnowballComponent extends ServerComponent {
   public size: SnowballSize = 0;
}

export default SnowballComponent;

export const SnowballComponentArray = new ServerComponentArray<SnowballComponent>(ServerComponentType.snowball, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});
   
function onTick(_snowballComponent: SnowballComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if ((physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) && physicsComponent.selfVelocity.lengthSquared() > 2500) {
      if (Board.tickIntervalHasPassed(0.05)) {
         createSnowParticle(transformComponent.position.x, transformComponent.position.y, randFloat(40, 60));
      }
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   snowballComponent.size = reader.readNumber();
}