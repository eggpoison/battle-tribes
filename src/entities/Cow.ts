import Board from "../Board";
import Entity, { EventType } from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent, { CircleHitboxInfo, RectangleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import ResourceSpawnComponent from "../entity-components/ResourceSpawnerComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { ItemName } from "../items";
import { getTilesByType, TileType } from "../tiles";
import { randItem } from "../utils";

class Cow extends Entity {
   private static readonly spawnableTileTypes: ReadonlyArray<TileType> = [
      TileType.grass
   ];

   /** The average amount of cows that spawn every second */
   public static readonly SPAWN_RATE = 1;

   private static readonly WIDTH = 1.5;
   private static readonly HEIGHT = 0.75;
   private static readonly MAX_HEALTH = 15;

   constructor() {
      // Calculate the position of the cow
      const potentialTileCoordinates = getTilesByType(Cow.spawnableTileTypes);
      const spawnTileCoordinates = randItem(potentialTileCoordinates);
      const position = Board.getRandomPositionInTile(spawnTileCoordinates);

      const EYE_SIZE = 0.2;
      const EYE_OFFSET = 0.3;
      const EYE_POS = -0.55;

      const renderClasses: RenderClasses = [
         // Main body
         new EllipseRenderClass({
            type: "ellipse",
            fillColour: "#8c3a00",
            offset: [0, 0.2],
            size: {
               radius: [Cow.HEIGHT / 2, Cow.WIDTH / 2]
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 1
         }),
         // Head
         new EllipseRenderClass({
            type: "ellipse",
            fillColour: "#b57910",
            offset: [0, -0.3],
            size: {
               radius: Cow.HEIGHT / 2
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 2
         }),
         // Left eye
         new EllipseRenderClass({
            type: "ellipse",
            fillColour: "#fff",
            offset: [-EYE_OFFSET, EYE_POS],
            size: {
               radius: EYE_SIZE / 2
            },
            border: {
               width: 2,
               colour: "#000"
            },
            zIndex: 3
         }),
         // Right eye
         new EllipseRenderClass({
            type: "ellipse",
            fillColour: "#fff",
            offset: [EYE_OFFSET, EYE_POS],
            size: {
               radius: EYE_SIZE / 2
            },
            border: {
               width: 2,
               colour: "#000"
            },
            zIndex: 3
         })
      ];

      const hitboxInfo: RectangleHitboxInfo = {
         type: "rectangle",
         width: Cow.WIDTH,
         height: Cow.HEIGHT
      };

      super([
         new TransformComponent(position),
         new RenderComponent(renderClasses),
         new HitboxComponent(hitboxInfo),
         new HealthComponent(Cow.MAX_HEALTH),
         new ResourceSpawnComponent()
      ]);

      this.getComponent(ResourceSpawnComponent)!.addResource(ItemName.meat, [1, 2], EventType.deathByEntity);
      this.getComponent(ResourceSpawnComponent)!.addResource(ItemName.leather, [0, 1], EventType.deathByEntity);
   }
}

export default Cow;