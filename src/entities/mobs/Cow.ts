import { EventType } from "../Entity";
import { RectangleHitboxInfo } from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import ResourceSpawnComponent from "../../entity-components/ResourceSpawnerComponent";
import  { ItemName } from "../../items";
import { TileType } from "../../tiles";
import { Point } from "../../utils";
import Mob from "./Mob";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import WanderAI from "../../entity-components/ai/WanderAI";

class Cow extends Mob {
   public readonly preferredTileTypes: ReadonlyArray<TileType> = [
      TileType.grass
   ];

   /** The average amount of cows that spawn every second */
   public static readonly SPAWN_RATE = 1;

   private static readonly WIDTH = 1.5;
   private static readonly HEIGHT = 1;
   private static readonly MAX_HEALTH = 15;

   constructor(position: Point) {
      const hitboxInfo: RectangleHitboxInfo = {
         type: "rectangle",
         width: Cow.WIDTH,
         height: Cow.HEIGHT
      };

      super(position, hitboxInfo, Cow.MAX_HEALTH, [
         new ResourceSpawnComponent(),
         new AIManagerComponent()
      ]);

      this.createRenderParts();

      this.createAI();

      this.getComponent(ResourceSpawnComponent)!.addResource(ItemName.meat, [1, 2], EventType.deathByEntity);
      this.getComponent(ResourceSpawnComponent)!.addResource(ItemName.leather, [0, 1], EventType.deathByEntity);
   }

   private createRenderParts(): void {
      const EYE_SIZE = 0.2;
      const EYE_OFFSET = 0.2;
      const EYE_POS = 0.35;

      // Create the main parts of the cow
      this.getComponent(RenderComponent)!.addParts([
         // Main body
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: "#8c3a00",
            offset: [-0.2, 0],
            size: {
               radius: [Cow.WIDTH / 2, Cow.HEIGHT / 2]
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
               radius: [Cow.HEIGHT / 2.5, Cow.HEIGHT / 2]
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

         this.getComponent(RenderComponent)!.addParts([
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

      const WANDER_RATE = 0.3;
      const WANDER_RANGE = 2;
      const WANDER_SPEED = 0.75;

      aiManagerComponent.addAI(
         new WanderAI(WANDER_RATE, WANDER_RANGE, WANDER_SPEED)
      );

      aiManagerComponent.setCurrentAIType("wander");
   }
}

export default Cow;