import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import NerdVision from "./dev/NerdVision";
import HealthBar from "./HealthBar";
import Hotbar from "./inventories/Hotbar";
import CraftingMenu from "./menus/CraftingMenu";
import HeldItem from "./HeldItem";
import DeathScreen from "./DeathScreen";
import BackpackInventoryMenu from "./inventories/BackpackInventory";
import TechTree from "./tech-tree/TechTree";
import BuildMenu from "./BuildMenu";
import TechInfocard from "./TechInfocard";
import InventorySelector from "./inventories/InventorySelector";
import InspectHealthBar from "./InspectHealthBar";
import Infocards from "./infocards/Infocards";
import SummonCrosshair from "./SummonCrosshair";
import { AppState } from "../App";
import { EntitySummonPacket } from "../../../../shared/src/dev-packets";
import { Mutable } from "../../../../shared/src/utils";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY } from "../../mouse";
import Client from "../../client/Client";
import AttackChargeBar from "./AttackChargeBar";
import GameInteractableLayer from "./GameInteractableLayer";

export const enum GameInteractState {
   none,
   summonEntity
}

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let toggleCinematicMode: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void = () => {};

interface GameScreenProps {
   setAppState(appState: AppState): void;
}

const GameScreen = (props: GameScreenProps) => {
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isDead, setIsDead] = useState(false);
   const [cinematicModeIsEnabled, setCinematicModeIsEnabled] = useState(false);
   const [interactState, setInteractState] = useState(GameInteractState.none);
   
   const summonPacketRef = useRef<Mutable<EntitySummonPacket> | null>(null);

   const placeEntity = useCallback((e: MouseEvent): void => {
      if (interactState !== GameInteractState.summonEntity) {
         return;
      }

      const summonPacket = summonPacketRef.current;
      if (summonPacket === null) {
         console.warn("summon packet is null");
         return;
      }
      
      if (e.button === 0) {
         summonPacket.position[0] = calculateCursorWorldPositionX(e.clientX)!;
         summonPacket.position[1] = calculateCursorWorldPositionY(e.clientY)!;
         summonPacket.rotation = 2 * Math.PI * Math.random();
         
         Client.sendEntitySummonPacket(summonPacket);
      } else if (e.button === 2) {
         // Get out of summon entity mode
         setInteractState(GameInteractState.none);
      }
      return;
   }, [interactState]);

   useEffect(() => {
      openSettingsMenu = (): void => setSettingsIsOpen(true);
      closeSettingsMenu = (): void => setSettingsIsOpen(false);

      gameScreenSetIsDead = setIsDead;
   }, []);

   useEffect(() => {
      if (cinematicModeIsEnabled) {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(false);
         }
      } else {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(true);
         }
      }
   }, [cinematicModeIsEnabled]);

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <GameInteractableLayer cinematicModeIsEnabled={cinematicModeIsEnabled} />
   
      <ChatBox />

      {!cinematicModeIsEnabled ? <>
         <HealthBar isDead={isDead} />
         <Infocards />
      </> : undefined}

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu />

      <HeldItem />

      {isDead ? (
         <DeathScreen setAppState={props.setAppState} />
      ) : undefined}

      {interactState !== GameInteractState.summonEntity ? (
         <NerdVision summonPacketRef={summonPacketRef} setGameInteractState={setInteractState} />
      ) : <>
         <div id="summon-prompt">
            <div className="line left"></div>
            <h2>Click to spawn</h2>
            <div className="line right"></div>
         </div>

         <SummonCrosshair />

         <div id="summon-entity-veil" onMouseDown={e => placeEntity(e.nativeEvent)}></div>
      </>}

      <TechTree />
      <TechInfocard />

      <BuildMenu />

      <InventorySelector />

      <InspectHealthBar />
   </>;
}

export default GameScreen;