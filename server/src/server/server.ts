import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData, VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { Server, Socket } from "socket.io";
import Board from "../Board";
import { runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import OPTIONS from "../options";
import { resetComponents } from "../components/ComponentArray";
import { createPlayer } from "../entities/tribes/player";
import { resetCensus } from "../census";
import { forceMaxGrowAllIceSpikes } from "../entities/resources/ice-spikes";
import SRandom from "../SRandom";
import { resetYetiTerritoryTiles } from "../entities/mobs/yeti";
import { resetPerlinNoiseCache } from "../perlin-noise";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { updateResourceDistributions } from "../resource-distributions";
import { updateGrassBlockers } from "../grass-blockers";
import { createGameDataPacket } from "./game-data-packets";
import PlayerClient from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients } from "./player-clients";

const isTimed = process.argv[2] === "timed";
const averageTickTimes = new Array<number>();

/*

Reference for future self:
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

*/

export type ISocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const estimateVisibleChunkBounds = (spawnPosition: Point, screenWidth: number, screenHeight: number): VisibleChunkBounds => {
   const zoom = 1;

   const halfScreenWidth = screenWidth * 0.5;
   const halfScreenHeight = screenHeight * 0.5;
   
   const minChunkX = Math.max(Math.floor((spawnPosition.x - halfScreenWidth / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((spawnPosition.x + halfScreenWidth / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((spawnPosition.y - halfScreenHeight / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((spawnPosition.y + halfScreenHeight / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   return [minChunkX, maxChunkX, minChunkY, maxChunkY];
}

// @Cleanup: Remove class, just have functions
/** Communicates between the server and players */
class GameServer {
   private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

   private tickInterval: NodeJS.Timeout | undefined;

   public trackedEntityID = 0;

   public isRunning = false;

   private nextTickTime = 0;
   
   /** Sets up the various stuff */
   public setup() {
      updateResourceDistributions();
      spawnInitialEntities();
      forceMaxGrowAllIceSpikes();
   }

   public setTrackedGameObject(id: number): void {
      SERVER.trackedEntityID = id;
   }

   public async start(): Promise<void> {
      if (!isTimed) {
         // Seed the random number generator
         if (OPTIONS.inBenchmarkMode) {
            SRandom.seed(40404040404);
         } else {
            SRandom.seed(randInt(0, 9999999999));
         }

         Board.setup();
         SERVER.setup();
      }
      
      if (SERVER.io === null) {
         // Start the server
         // SERVER.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(Settings.SERVER_PORT);
         SERVER.io = new Server(Settings.SERVER_PORT);
         SERVER.handlePlayerConnections();
         console.log("Server started on port " + Settings.SERVER_PORT);
      }

      SERVER.isRunning = true;
      
      if (isTimed) {
         if (typeof global.gc === "undefined") {
            throw new Error("GC function is undefined! Most likely need to pass in the '--expose-gc' flag.");
         }

         Math.random = () => SRandom.next();

         let j = 0;
         for (;;) {
            // Collect garbage from previous run
            for (let i = 0; i < 10; i++) {
               global.gc();
            }
            
            // Reset the board state
            Board.reset();
            resetYetiTerritoryTiles();
            resetCensus();
            resetComponents();
            resetPerlinNoiseCache();

            // Seed the random number generator
            if (OPTIONS.inBenchmarkMode) {
               SRandom.seed(40404040404);
            } else {
               SRandom.seed(randInt(0, 9999999999));
            }
            
            Board.setup();
            SERVER.setup();

            // Warm up the JIT
            for (let i = 0; i < 50; i++) {
               SERVER.tick();
            }
            
            // @Bug: When at 5000, the average tps starts at around 1.8, while at 1000 it starts at .6
            const numTicks = 1000;
            
            const startTime = performance.now();

            const a = [];
            let l = startTime;
            for (let i = 0; i < numTicks; i++) {
               SERVER.tick();
               const n = performance.now();
               a.push(n - l);
               l = n;
            }

            const timeElapsed = performance.now() - startTime;
            const averageTickTimeMS = timeElapsed / numTicks;
            averageTickTimes.push(averageTickTimeMS);
            console.log("(#" + (j + 1) + ") Average tick MS: " + averageTickTimeMS);
            console.log(Math.min(...a), Math.max(...a));
            j++;
         }
      }

      if (typeof SERVER.tickInterval === "undefined") {
         while (SERVER.isRunning) {
            await SERVER.tick();
         }
      }
   }

   private async tick(): Promise<void> {
      // These are done before each tick to account for player packets causing entities to be removed/added between ticks.
      Board.pushJoinBuffer();
      Board.destroyFlaggedEntities();
      Board.updateTribes();
      
      // @Temporary: remove once blockers are done
      Board.spreadGrass();
      updateGrassBlockers();

      Board.updateEntities();
      updateDynamicPathfindingNodes();
      Board.resolveEntityCollisions();

      runSpawnAttempt();
      
      Board.pushJoinBuffer();
      Board.destroyFlaggedEntities();
      Board.updateTribes();

      if (!isTimed) {
         await SERVER.sendGameDataPackets();
      }

      // Update server ticks and time
      // This is done at the end of the tick so that information sent by players is associated with the next tick to run
      Board.ticks++;
      Board.time += Settings.TIME_PASS_RATE / Settings.TPS / 3600;
      if (Board.time >= 24) {
         Board.time -= 24;
      }

      if (Board.ticks % Settings.TPS === 0) {
         updateResourceDistributions();
      }
   }

   private handlePlayerConnections(): void {
      if (SERVER.io === null) return;

      SERVER.io.on("connection", (socket: ISocket) => {
         // @Temporary
         // setTimeout(() => {
         //    if(1+1===2)return;
         //    const p = this.getPlayerFromUsername(username)!;
         //    const tc = TribeComponentArray.getComponent(p.id);
         //    const tribe = tc.tribe;

         //    createTribeWarrior(new Point(spawnPosition.x - 100, spawnPosition.y), tribe, 0);
         // }, 3000);
         
         // @Temporary
         
         // setTimeout(() => {
         //    createTribeWorker(new Point(spawnPosition.x + 500, spawnPosition.y + 150), -1, 0);
         // }, 5000);
         
         // setTimeout(() => {
         //    if(1+1===2)return;
         //    const p = this.getPlayerFromUsername(username)!;
         //    const tc = TribeComponentArray.getComponent(p.id);
         //    const tribe = tc.tribe;
         //    const TRIB = tribe;
            
         //    // const TRIB = new Tribe(TribeType.goblins, true);

         //    createTribeTotem(new Point(spawnPosition.x + 500, spawnPosition.y), 0, TRIB);

         //    const h1 = createWorkerHut(new Point(spawnPosition.x + 380, spawnPosition.y + 50), Math.PI * 1.27, TRIB);
         //    const h2 = createWorkerHut(new Point(spawnPosition.x + 547, spawnPosition.y - 100), Math.PI * 2.87, TRIB);
         //    const h3 = createWorkerHut(new Point(spawnPosition.x + 600, spawnPosition.y + 65), 0.7, TRIB);
         //    const h4 = createWorkerHut(new Point(spawnPosition.x + 700, spawnPosition.y - 65), -0.7, TRIB);
         //    const h5 = createWorkerHut(new Point(spawnPosition.x + 320, spawnPosition.y + 100), -Math.PI*0.4, TRIB);

         //    const w1 = createTribeWorker(h1.position.copy(), 0, TRIB.id, h1.id);
         //    const w2 = createTribeWorker(h2.position.copy(), 0, TRIB.id, h2.id);
         //    const w3 = createTribeWorker(h3.position.copy(), 0, TRIB.id, h3.id);
         //    const w4 = createTribeWorker(h4.position.copy(), 0, TRIB.id, h4.id);
         //    const w5 = createTribeWorker(h5.position.copy(), 0, TRIB.id, h5.id);

         //    const ps = new Array<Entity>();

         //    for (let y = -2; y <= 1; y++) {
         //       const yo = randFloat(-3, 3);
         //       for (let x = 0; x <= 10; x++) {
         //          const p = createPlanterBox(new Point(spawnPosition.x - 0 - 80 * x, spawnPosition.y + 150 * y + yo), 0, tribe);
         //          ps.push(p);
         //       }
         //    }

         //    // top walls
         //    for (let x = 0; x <= 14; x++) {
         //       createWall(new Point(spawnPosition.x - 64 * x, spawnPosition.y + 220), 0, tribe);
         //    }

         //    // bottom walls
         //    for (let x = 0; x <= 14; x++) {
         //       createWall(new Point(spawnPosition.x - 64 * x, spawnPosition.y - 368), 0, tribe);
         //    }

         //    // left walls
         //    for (let y = -4; y <= 3; y++) {
         //       createWall(new Point(spawnPosition.x - 64 * 14, spawnPosition.y + y * 64 - 40), 0, tribe);
         //    }

         //    // const p1 = createPlanterBox(new Point(spawnPosition.x - 50, spawnPosition.y + 80), 0, tribe);
         //    // const p2 = createPlanterBox(new Point(spawnPosition.x - 50, spawnPosition.y - 80), 0.1, tribe);
         //    // const p3 = createPlanterBox(new Point(spawnPosition.x - 210, spawnPosition.y + 80), 0, tribe);
         //    // const p4 = createPlanterBox(new Point(spawnPosition.x - 210, spawnPosition.y - 80), 0.1, tribe);

         //    setTimeout(() => {
         //       // placePlantInPlanterBox(p1, PlanterBoxPlant.berryBush);
         //       // placePlantInPlanterBox(p2, PlanterBoxPlant.berryBush);
         //       // placePlantInPlanterBox(p3, PlanterBoxPlant.berryBush);
         //       // placePlantInPlanterBox(p4, PlanterBoxPlant.berryBush);
         //       for (let i = 0; i < ps.length; i++) {
         //          const p = ps[i];
         //          placePlantInPlanterBox(p, PlanterBoxPlant.tree);
         //       }
         //    }, 100);

         //    // createWorkbench(new Point(spawnPosition.x + 520, spawnPosition.y + 230), 0.8, TRIB);
         //    // createTree(new Point(spawnPosition.x, spawnPosition.y + 200), 0, tribe);
         //    // createWall(new Point(spawnPosition.x + 64, spawnPosition.y + 200), 0, TRIB);
         //    createBarrel(new Point(spawnPosition.x + 170, spawnPosition.y - 150), Math.PI * 0.38, TRIB);
         //    createBarrel(new Point(spawnPosition.x + 230, spawnPosition.y - 210), Math.PI * 0.8, TRIB);
         //    // createDoor(new Point(spawnPosition.x, spawnPosition.y + 200), 0, TRIB, BuildingMaterial.wood);
         // }, 4000);


         socket.on("initial_player_data", (username: string, tribeType: TribeType, screenWidth: number, screenHeight: number) => {
            const spawnPosition = generatePlayerSpawnPosition(tribeType);
            const visibleChunkBounds = estimateVisibleChunkBounds(spawnPosition, screenWidth, screenHeight);

            const tribe = new Tribe(tribeType, false);
            const player = createPlayer(spawnPosition, tribe, username);

            const playerClient = new PlayerClient(socket, tribe, visibleChunkBounds, player.id, username);
            addPlayerClient(playerClient, player);
         });
      });
   }

   // @Cleanup: maybe move this function to player-clients?
   /** Send data about the server to all players */
   public async sendGameDataPackets(): Promise<void> {
      if (SERVER.io === null) return;
      
      return new Promise(async resolve => {
         const currentTime = performance.now();
         while (this.nextTickTime < currentTime) {
            this.nextTickTime += 1000 * Settings.I_TPS;
         }
         
         // @Speed: use while loop instead maybe?
         await (() => {
            return new Promise<void>(resolve => {
               // console.log(currentTime, this.nextTickTime, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
               setTimeout(() => {
                  resolve();
               }, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
            })
         })();

         // setTimeout(() => {
            const playerClients = getPlayerClients();
            for (let i = 0; i < playerClients.length; i++) {
               const playerClient = playerClients[i];
               if (!playerClient.clientIsActive) {
                  continue;
               }

               // Send the game data to the player
               const gameDataPacket = createGameDataPacket(playerClient);
               playerClient.socket.emit("game_data_packet", gameDataPacket);
   
               playerClient.visibleHits = [];
               playerClient.playerKnockbacks = [];
               playerClient.heals = [];
               playerClient.orbCompletes = [];
               playerClient.pickedUpItem = false;
            }

            // console.log(performance.now());

            resolve();
         // }, this.nextTickTime - currentTime);
      });
   }
}

export const SERVER = new GameServer();
SERVER.start();