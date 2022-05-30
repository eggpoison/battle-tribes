import Board from "./Board";
import Camera from "./Camera";
import { getCanvasContext, getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import Player, { PlayerInteractionMode } from "./entities/tribe-members/Player";
import TribeWorker from "./entities/tribe-members/TribeWorker";
import TransformComponent from "./entity-components/TransformComponent";
import { Point, setWindowFocus } from "./utils";

abstract class Mouse {
   public static readonly UNIT_SELECTION_COLOUR = "#ffff00";
   public static readonly OPAQUE_UNIT_SELECTION_COLOUR = "rgba(255, 255, 0, 0.3)";

   private static tribeSelectStartPosition: Point | null = null;
   private static tribeSelectEndPosition: Point | null = null;

   private static selectedUnits = new Array<TribeWorker>();

   private static isSelectingUnits: boolean = false;

   private static lastMouseEvent: MouseEvent | undefined;

   public static setup(): void {
      document.addEventListener("mousedown", e => this.mouseDown(e));
      document.addEventListener("mousemove", e => this.mouseMove(e));
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

   public static getSelectedUnits(): Array<TribeWorker> {
      return this.selectedUnits;
   }
   
   public static deselectUnits(): void {
      this.selectedUnits = new Array<TribeWorker>();
   }

   public static removeSelectedUnit(unit: TribeWorker): void {
      const idx = this.selectedUnits.indexOf(unit);
      if (idx !== -1) {
         this.selectedUnits.splice(idx, 1);
      }
   }

   private static mouseDown(e: MouseEvent): void {
      setWindowFocus(true);

      if (!this.validateEvent(e)) return;

      // Player attack
      Player.instance.attack();

      // Select units
      if (e.button === 0 && Player.currentInteractionMode === PlayerInteractionMode.SelectUnits) {
         this.isSelectingUnits = true;
         
         const playerPosition = Player.instance.getComponent(TransformComponent)!.position;
         const x = playerPosition.x + e.clientX - getCanvasWidth() / 2;
         const y = playerPosition.y + e.clientY - getCanvasHeight() / 2;
         this.tribeSelectStartPosition = new Point(x, y);

         this.lastMouseEvent = e;
      }

      // Command units
      if (e.button === 2) {
         this.commandUnits(e);
      }
   }

   private static mouseMove(e: MouseEvent): void {
      if (!this.validateEvent(e)) return;

      if (this.isSelectingUnits) {
         this.lastMouseEvent = e;
      }
   }

   public static updateUnitSelectionBounds(): void {
      if (typeof this.lastMouseEvent === "undefined") return;

      if (this.isSelectingUnits) {
         const playerPosition = Player.instance.getComponent(TransformComponent)!.position;
         const x = playerPosition.x + this.lastMouseEvent.clientX - getCanvasWidth() / 2;
         const y = playerPosition.y + this.lastMouseEvent.clientY - getCanvasHeight() / 2;
         this.tribeSelectEndPosition = new Point(x, y);
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
         
         this.isSelectingUnits = false;         

         this.tribeSelectStartPosition = null;
         this.tribeSelectEndPosition = null;

         this.lastMouseEvent = undefined;
      }
   }

   private static openContextMenu(e: MouseEvent): void {
      if (!this.validateEvent(e)) {
         setWindowFocus(false);

         return;
      }
      
      // Stop the context menu from opening
      e.preventDefault();
   }

   private static runTribeSelect(): void {
      this.selectedUnits = this.calculateSelectedUnits();
   }

   private static calculateSelectedUnits(): Array<TribeWorker> {
      const chunkUnits = Board.tileSize * Board.chunkSize;

      const minSelectX = Math.min(this.tribeSelectStartPosition!.x, this.tribeSelectEndPosition!.x);
      const maxSelectX = Math.max(this.tribeSelectStartPosition!.x, this.tribeSelectEndPosition!.x);
      const minSelectY = Math.min(this.tribeSelectStartPosition!.y, this.tribeSelectEndPosition!.y);
      const maxSelectY = Math.max(this.tribeSelectStartPosition!.y, this.tribeSelectEndPosition!.y);

      // Calculate selection chunk bounds
      const minChunkX = Math.max(Math.floor(minSelectX / chunkUnits), 0);
      const maxChunkX = Math.min(Math.floor(maxSelectX / chunkUnits), Board.size - 1);
      const minChunkY = Math.max(Math.floor(minSelectY / chunkUnits), 0);
      const maxChunkY = Math.min(Math.floor(maxSelectY / chunkUnits), Board.size - 1);

      const selectedEntities = new Array<TribeWorker>();

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Board.getChunk(chunkX, chunkY)!;

            for (const entity of chunk) {
               // If the entity is a tribe member
               if (entity instanceof TribeWorker && entity.tribe.type === "humans") {
                  const position = entity.getComponent(TransformComponent)!.position;
                  const radius = (entity.SIZE as number) * Board.tileSize;

                  // If the entity is within the selection bounds
                  if (position.x + radius >= minSelectX
                  && position.y + radius >= minSelectY
                  && position.x - radius <= maxSelectX
                  && position.y - radius <= maxSelectY) {
                     selectedEntities.push(entity);
                  }
               }
            }
         }
      }

      return selectedEntities;
   }

   public static drawUnitSelectionTool(): void {
      if (this.tribeSelectStartPosition === null || this.tribeSelectEndPosition === null) {
         return;
      }

      const minSelectX = Math.min(this.tribeSelectStartPosition.x, this.tribeSelectEndPosition.x);
      const maxSelectX = Math.max(this.tribeSelectStartPosition.x, this.tribeSelectEndPosition.x);
      const minSelectY = Math.min(this.tribeSelectStartPosition.y, this.tribeSelectEndPosition.y);
      const maxSelectY = Math.max(this.tribeSelectStartPosition.y, this.tribeSelectEndPosition.y);
      
      const ctx = getCanvasContext();

      ctx.fillStyle = this.OPAQUE_UNIT_SELECTION_COLOUR;

      const cameraMinX = Camera.getXPositionInCamera(minSelectX);
      const cameraMaxX = Camera.getXPositionInCamera(maxSelectX);
      const cameraMinY = Camera.getYPositionInCamera(minSelectY);
      const cameraMaxY = Camera.getYPositionInCamera(maxSelectY);

      // Draw selection area
      ctx.fillRect(cameraMinX, cameraMinY, cameraMaxX - cameraMinX, cameraMaxY - cameraMinY);

      ctx.strokeStyle = this.UNIT_SELECTION_COLOUR;
      ctx.lineWidth = 5;

      ctx.beginPath();

      // Draw selection border
      ctx.moveTo(cameraMinX, cameraMinY); // Start at top left
      ctx.lineTo(cameraMaxX, cameraMinY); // Top right
      ctx.lineTo(cameraMaxX, cameraMaxY); // Bottom right
      ctx.lineTo(cameraMinX, cameraMaxY); // Bottom left
      ctx.lineTo(cameraMinX, cameraMinY); // Top left

      ctx.stroke();
   }

   private static commandUnits(e: MouseEvent): void {
      // Get the clicked position
      const playerPosition = Player.instance.getComponent(TransformComponent)!.position;
      const x = playerPosition.x + e.clientX - getCanvasWidth() / 2;
      const y = playerPosition.y + e.clientY - getCanvasHeight() / 2;
      const clickedPosition = new Point(x, y);

      // Move all selected units to that position
      for (const unit of this.selectedUnits) {
         unit.commandToPosition(clickedPosition);
      }
   }
}

export default Mouse;