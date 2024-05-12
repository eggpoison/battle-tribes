import { RockSpikeProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class RockSpikeComponent extends ServerComponent<ServerComponentType.rockSpike> {
   public readonly size: number;
   public readonly lifetime: number;

   constructor(entity: Entity, data: RockSpikeProjectileComponentData) {
      super(entity);

      this.size = data.size;
      this.lifetime = data.lifetime;
   }

   public updateFromData(_data: RockSpikeProjectileComponentData): void {}
}

export default RockSpikeComponent;