import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { ProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";

class ProjectileComponent extends ServerComponent<ServerComponentType.projectile> {
   constructor(entity: Entity, data: ProjectileComponentData) {
      super(entity);
   }

   public updateFromData(_data: ProjectileComponentData): void {}
}

export default ProjectileComponent;