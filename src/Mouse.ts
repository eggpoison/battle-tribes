import Board from "./Board";
import { getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import GenericTribeMember from "./entities/tribe-members/GenericTribeMember";
import Player, { PlayerInteractionMode } from "./entities/tribe-members/Player";
import TransformComponent from "./entity-components/TransformComponent";
import { Point } from "./utils";

abstract class Mouse {
   private static tribeSelectStartPosition: Point;
   private static tribeSelectEndPosition: Point;

   private static selectedUnits = new Array<GenericTribeMember>();

   public static readonly UNIT_SELECTION_COLOUR = "#ffff00";

   public static setup(): void {
      document.addEventListener("mousedown", e => this.mouseDown(e));
      document.addEventListener("mouseup", e => this.mouseUp(e));
      document.addEventListener("contextmenu", e => this.openContextMenu(e))
   }

   private static validateEvent(e: Event): boolean {
      if (e instanceof MouseEvent) {
         // Return false if the player clicked something other than the game canvas.
         if ((e.target as HTMLElement).id !== "canvas") {
            return false;
         }
      }

      return true;
   }

   public static getSelectedUnits(): Array<GenericTribeMember> {
      return this.selectedUnits;
   }
   
   public static deselectUnits(): void {
      this.selectedUnits = new Array<GenericTribeMember>();
   }

   private static mouseDown(e: MouseEvent): void {
      if (!this.validateEvent(e)) return;

      // Player attack
      Player.instance.attack();

      // Tribe select
      if (e.button === 0 && Player.currentInteractionMode === PlayerInteractionMode.SelectUnits) {
         const playerPosition = Player.instance.getComponent(TransformComponent)!.position;
         const x = playerPosition.x + e.clientX - getCanvasWidth() / 2;
         const y = playerPosition.y + e.clientY - getCanvasHeight() / 2;
         this.tribeSelectStartPosition = new Point(x, y);
      }
   }

   private static mouseUp(e: MouseEvent): void {
      if (!this.validateEvent(e)) return;

      // Tribe select
      if (e.button === 0 && Player.currentInteractionMode === PlayerInteractionMode.SelectUnits) {
         const playerPosition = Player.instance.getComponent(TransformComponent)!.position;
         const x = playerPosition.x + e.clientX - getCanvasWidth() / 2;
         const y = playerPosition.y + e.clientY - getCanvasHeight() / 2;
         this.tribeSelectEndPosition = new Point(x, y);

         this.runTribeSelect();
      }
   }

   private static openContextMenu(e: MouseEvent): void {
      if (!this.validateEvent(e)) return;
      
      // Stop the context menu from opening
      e.preventDefault();
   }

   private static runTribeSelect(): void {
      this.selectedUnits = this.calculateSelectedUnits();
   }

   private static calculateSelectedUnits(): Array<GenericTribeMember> {
      const chunkUnits = Board.tileSize * Board.chunkSize;

      const minSelectX = Math.min(this.tribeSelectStartPosition.x, this.tribeSelectEndPosition.x);
      const maxSelectX = Math.max(this.tribeSelectStartPosition.x, this.tribeSelectEndPosition.x);
      const minSelectY = Math.min(this.tribeSelectStartPosition.y, this.tribeSelectEndPosition.y);
      const maxSelectY = Math.max(this.tribeSelectStartPosition.y, this.tribeSelectEndPosition.y);

      // Calculate selection chunk bounds
      const minChunkX = Math.max(Math.floor(minSelectX / chunkUnits), 0);
      const maxChunkX = Math.min(Math.floor(maxSelectX / chunkUnits), Board.size - 1);
      const minChunkY = Math.max(Math.floor(minSelectY / chunkUnits), 0);
      const maxChunkY = Math.min(Math.floor(maxSelectY / chunkUnits), Board.size - 1);

      const selectedEntities = new Array<GenericTribeMember>();

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Board.getChunk(chunkX, chunkY)!;

            for (const entity of chunk) {
               // If the entity is a tribe member
               if (entity instanceof GenericTribeMember && !(entity instanceof Player) && entity.tribe.type === "humans") {
                  const position = entity.getComponent(TransformComponent)!.position;
                  const size = entity.SIZE as number;

                  // If the entity is within the selection bounds
                  if (position.x + size/2 >= minSelectX
                  && position.y + size/2 >= minSelectY
                  && position.x - size/2 <= maxSelectX
                  && position.y - size/2 <= maxSelectY) {
                     selectedEntities.push(entity);
                  }
               }
            }
         }
      }

      return selectedEntities;
   }
}

export default Mouse;