import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { playSound, attachSoundToEntity } from "../sound";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

class BattleaxeProjectileComponent extends ServerComponent {
   public onLoad(): void {
      playWhoosh(this);
   }

   public padData(): void {}
   public updateFromData(): void {}
}

export default BattleaxeProjectileComponent;

export const BattleaxeProjectileComponentArray = new ComponentArray<BattleaxeProjectileComponent>(ComponentArrayType.server, ServerComponentType.battleaxeProjectile, true, {
   onTick: onTick
});

const playWhoosh = (battleaxeProjectileComponent: BattleaxeProjectileComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(battleaxeProjectileComponent.entity.id);
   
   const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, transformComponent.position);
   attachSoundToEntity(soundInfo.sound, battleaxeProjectileComponent.entity.id);
}

function onTick(battleaxeProjectileComponent: BattleaxeProjectileComponent): void {
   if (Board.tickIntervalHasPassed(0.25)) {
      playWhoosh(battleaxeProjectileComponent);
   }
}