import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import Board from "../../Board";
import { playSound, attachSoundToEntity } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

class BattleaxeProjectileComponent extends ServerComponent {}

export default BattleaxeProjectileComponent;

export const BattleaxeProjectileComponentArray = new ServerComponentArray<BattleaxeProjectileComponent>(ServerComponentType.battleaxeProjectile, true, {
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const playWhoosh = (entity: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, transformComponent.position);
   attachSoundToEntity(soundInfo.sound, entity);
}

function onLoad(_battleaxeProjectileComponent: BattleaxeProjectileComponent, entity: EntityID): void {
   playWhoosh(entity);
}

function onTick(_battleaxeProjectileComponent: BattleaxeProjectileComponent, entity: EntityID): void {
   if (Board.tickIntervalHasPassed(0.25)) {
      playWhoosh(entity);
   }
}

function padData(): void {}

function updateFromData(): void {}