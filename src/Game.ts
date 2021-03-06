import Board from "./Board";
import Camera from "./Camera";
import { clearCanvas, renderFog, renderGroundTiles, renderWallTiles } from "./components/Canvas";
import { Minimap } from "./components/MinimapCanvas";
import { stopPlayerMovement } from "./entity-components/PlayerControllerComponent";
import EntitySpawner from "./EntitySpawner";
import Mouse from "./Mouse";
import SETTINGS from "./settings";
import { timers } from "./Timer";

const NIGHT_START = 20;
const NIGHT_END = 6;

let previousFocus = true;

abstract class Game {
   public static ticks = 0;
   public static secondsElapsed = 0;

   // private static readonly TIME_SPEED = 1.5;
   private static readonly TIME_SPEED = 50;
   private static time: number = SETTINGS.startTime;

   public static tick(): void {
      Game.ticks++;
      Game.secondsElapsed += 1 / SETTINGS.tps;

      Game.time += Game.TIME_SPEED / SETTINGS.tps / 60;
      if (Game.time >= 24) Game.time -= 24;

      // Update timers
      for (let idx = timers.length - 1; idx >= 0; idx--) {
         const timer = timers[idx];
         timer.tick();

         if (timer.hasExpired()) {
            timer.onEnd();

            timers.splice(idx, 1);
         }
      }
 
      // Update the camera position to match the followed entity
      Camera.updateCameraPosition();
      Camera.tick();

      // Clear the canvas for redrawing
      clearCanvas();

      // Order of rendering: Ground tiles -> Entities -> Wall tiles

      // Draw ground layer of tiles
      renderGroundTiles();

      // Spawn mobs and resources
      EntitySpawner.runSpawnAttempt();

      Board.tick();
      
      Mouse.updateMouse();
      Mouse.updateUnitSelectionBounds();
      Mouse.drawUnitSelectionTool();

      // Draw walls
      // Called after the Board.tick function so that walls are rendered above entities
      renderWallTiles();

      Board.updateDamageTexts();

      // Draw the darkness effect given by night time
      Board.drawDarkness();
      
      // Update the minimap
      const changedTiles = Board.getChangedTiles();
      Minimap.updateBackground(changedTiles);
      // Update the minimap entities
      Minimap.drawEntities();

      if (SETTINGS.showFogOfWar) {
         renderFog();
      }

      const focus = document.hasFocus();
      if (previousFocus !== focus && focus) stopPlayerMovement();
      previousFocus = focus;

      Board.clearValues();
   }

   /**
    * 
    * @returns How dark the sky is from 0-1 (1 is fully dark)
    */
   public static getSkyDarkness(): number {
      const TRANSITION_TIME = 2;

      // Night time
      if (this.time >= NIGHT_START || this.time <= NIGHT_END) {
         return 1;
      }

      if (this.time <= NIGHT_END + TRANSITION_TIME) {
         return 1 - (this.time - NIGHT_END) / TRANSITION_TIME;
      }
      if (this.time >= NIGHT_START - TRANSITION_TIME) {
         return 1 - (NIGHT_START - this.time) / TRANSITION_TIME;
      }

      return 0;
   }

   public static isNight(): boolean {
      return this.time <= NIGHT_END || this.time >= NIGHT_START;
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;