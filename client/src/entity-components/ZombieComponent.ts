import { ServerComponentType, ZombieComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";

class ZombieComponent extends ServerComponent<ServerComponentType.zombie> {
   public readonly zombieType: number;
   
   constructor(entity: Entity, data: ZombieComponentData) {
      super(entity);

      this.zombieType = data.zombieType;
   }

   public updateFromData(_data: ZombieComponentData): void {}
}

export default ZombieComponent;