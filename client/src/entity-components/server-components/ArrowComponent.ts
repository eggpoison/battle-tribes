import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";

class ProjectileComponent extends ServerComponent {}

export default ProjectileComponent;

export const ProjectileComponentArray = new ServerComponentArray<ProjectileComponent>(ServerComponentType.projectile, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}
   
function updateFromData(): void {}