import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { playSound } from "../../sound";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

class SpearProjectileComponent extends ServerComponent {}

export default SpearProjectileComponent;

export const SpearProjectileComponentArray = new ServerComponentArray<SpearProjectileComponent>(ServerComponentType.spearProjectile, true, {
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

function onSpawn(_spearProjectileComponent: SpearProjectileComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("spear-throw.mp3", 0.4, 1, transformComponent.position);
}

function padData(): void {}

function updateFromData(): void {}