import Board from "../Board";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { getEntityInfo } from "../data/entity-info";
import Game from "../Game";
import SETTINGS from "../settings";
import { Point, randInt } from "../utils";
import Entity, { RenderLayer } from "./Entity";
import Zombie from "./mobs/Zombie";

class Tombstone extends Entity {
   public readonly name = "Tombstone";
   public readonly SIZE: number = 1.5;

   /** Chance for a tombstone to spawn a zombie each second */
   private static readonly ZOMBIE_SPAWN_CHANCE = 0.05;

   /** Chance for a tombstone to die each second when it's day */
   private static readonly DIE_CHANCE = 0.15;

   private currentZombie: Zombie | null = null;
   
   constructor(position: Point) {
      super(RenderLayer.LowResources, [
         new TransformComponent(position, true),
         new RenderComponent()
      ]);
      
      this.createRenderParts();
   }

   private createRenderParts(): void {
      const id = randInt(1, 3);
      const url = `tombstone-${id}.png`;

      this.getComponent(RenderComponent)!.addPart(new ImageRenderPart({
         size: {
            width: this.SIZE,
            height: this.SIZE
         },
         url: url
      }));
   }

   public tick(): void {
      // If it's day, remove the tombstone at a random point
      if (!Game.isNight() && Math.random() < Tombstone.DIE_CHANCE / SETTINGS.tps) {
         Board.removeEntity(this);

         return;
      }

      super.tick();

      if (this.currentZombie === null && Math.random() < Tombstone.ZOMBIE_SPAWN_CHANCE / SETTINGS.tps) {
         const position = this.getComponent(TransformComponent)!.position;
         
         const zombie = new Zombie(position);
         zombie.setInfo(getEntityInfo(zombie));
         Board.addEntity(zombie);

         this.currentZombie = zombie;

         zombie.createEvent("die", () => {
            this.currentZombie = null;
         });
      }
   }
}

export default Tombstone;