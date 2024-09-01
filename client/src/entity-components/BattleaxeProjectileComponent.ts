import { ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { playSound, attachSoundToEntity } from "../sound";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

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
   const transformComponent = battleaxeProjectileComponent.entity.getServerComponent(ServerComponentType.transform);
   
   const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, transformComponent.position);
   attachSoundToEntity(soundInfo.sound, battleaxeProjectileComponent.entity);
}

function onTick(battleaxeProjectileComponent: BattleaxeProjectileComponent): void {
   if (Board.tickIntervalHasPassed(0.25)) {
      playWhoosh(battleaxeProjectileComponent);
   }
}