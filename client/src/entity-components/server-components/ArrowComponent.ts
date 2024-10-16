import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class ProjectileComponent {}

export default ProjectileComponent;

export const ProjectileComponentArray = new ServerComponentArray<ProjectileComponent>(ServerComponentType.projectile, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}
   
function updateFromData(): void {}