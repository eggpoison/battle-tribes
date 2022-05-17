import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import  { ItemName } from "../../items/items";
import { TileType } from "../../tiles";
import { Point } from "../../utils";
import Mob from "./Mob";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import WanderAI from "../../entity-components/ai/WanderAI";

class Cow extends Mob {
   public readonly preferredTileTypes: ReadonlyArray<TileType> = [
      TileType.grass
   ];

   public readonly SIZE = {
      WIDTH: 1.5,
      HEIGHT: 1
   };

   private static readonly MAX_HEALTH = 15;

   constructor(position: Point) {
      super(position, [
         new ItemSpawnComponent(),
         new AIManagerComponent()
      ]);

      super.setMaxHealth(Cow.MAX_HEALTH);

      this.createAI();

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.meat, [1, 2], "deathByEntity");
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.leather, [0, 1], "deathByEntity");
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "rectangle",
         width: this.SIZE.WIDTH,
         height: this.SIZE.HEIGHT
      });
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      const EYE_SIZE = 0.2;
      const EYE_OFFSET = 0.2;
      const EYE_POS = 0.35;

      // Create the main parts of the cow
      renderComponent.addParts([
         // Main body
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: "#8c3a00",
            offset: [-0.2, 0],
            size: {
               radius: [this.SIZE.WIDTH / 2, this.SIZE.HEIGHT / 2]
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 1
         }),
         // Head
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: "#b57910",
            offset: [0.3, 0],
            size: {
               radius: [this.SIZE.HEIGHT / 2.5, this.SIZE.HEIGHT / 2]
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 2
         })
      ]);

      // Create the cow's eyes
      for (let i = 0; i < 2; i++) {
         const multipier = i === 0 ? -1 : 1;

         renderComponent.addParts([
            // Eye
            new EllipseRenderPart({
               type: "ellipse",
               fillColour: "#fff",
               offset: [EYE_POS, EYE_OFFSET * multipier],
               size: {
                  radius: EYE_SIZE / 2
               },
               border: {
                  width: 2,
                  colour: "#000"
               },
               zIndex: 3
            }),
            // Pupil
            new EllipseRenderPart({
               type: "ellipse",
               fillColour: "#000",
               offset: [EYE_POS, EYE_OFFSET * multipier],
               size: {
                  radius: EYE_SIZE / 4
               },
               zIndex: 4
            }),
         ]);
      }
   }

   private createAI(): void {
      const aiManagerComponent = this.getComponent(AIManagerComponent)!;

      const WANDER_CHANCE = 0.3;
      const RANGE = 2;
      const SPEED = 0.75;

      aiManagerComponent.addAI(
         new WanderAI("wander", {
            range: RANGE,
            speed: SPEED,
            wanderRate: WANDER_CHANCE
         })
      );

      aiManagerComponent.changeCurrentAI("wander");
   }
}

export default Cow;