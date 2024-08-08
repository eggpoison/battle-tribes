import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class ProjectileComponent extends ServerComponent {
   public padData(): void {}
   
   public updateFromData(): void {}
}

export default ProjectileComponent;

export const ProjectileComponentArray = new ComponentArray<ProjectileComponent>(ComponentArrayType.server, ServerComponentType.projectile, {});