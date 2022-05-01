import Component from "../../Component";
import Entity from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent, { HitboxInfo } from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { TileType } from "../../tiles";
import { Point } from "../../utils";

interface MobData {
   readonly preferredTileTypes?: ReadonlyArray<TileType>;
}

abstract class Mob extends Entity implements MobData {
   public abstract readonly preferredTileTypes?: ReadonlyArray<TileType>;

   constructor(position: Point, hitbox: HitboxInfo, maxHealth: number, components: ReadonlyArray<Component>) {
      super([
         new TransformComponent(),
         new RenderComponent(),
         new HitboxComponent(hitbox),
         new HealthComponent(maxHealth),
         ...components
      ]);

      this.getComponent(TransformComponent)!.position = position;
   }
}

export default Mob;