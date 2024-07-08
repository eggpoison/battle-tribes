import { useCallback, useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import NerdVision from "./dev/NerdVision";
import HealthBar from "./HealthBar";
import PauseScreen from "./PauseScreen";
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
import { GameInteractState } from "../../Game";
import SummonCrosshair from "./SummonCrosshair";

export let showPauseScreen: () => void = () => {};
export let hidePauseScreen: () => void = () => {};

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let toggleCinematicMode: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void;

interface GameScreenProps {
   readonly interactState: GameInteractState;
}

const GameScreen = (props: GameScreenProps) => {
   const [isPaused, setIsPaused] = useState(false);
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isDead, setIsDead] = useState(false);
   const [cinematicModeIsEnabled, setCinematicModeIsEnabled] = useState(false);

   useEffect(() => {
      showPauseScreen = (): void => setIsPaused(true);
      hidePauseScreen = (): void => setIsPaused(false);
      
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
      <ChatBox />

      {!cinematicModeIsEnabled ? <>
         <HealthBar />
         <Hotbar />
         <Infocards />
      </> : undefined}

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu />

      <HeldItem />

      {isDead ? (
         <DeathScreen />
      ) : undefined}

      {props.interactState !== GameInteractState.summonEntity ? (
         <NerdVision />
      ) : <>
         <div id="summon-prompt">
            <div className="line left"></div>
            <h2>Click to spawn</h2>
            <div className="line right"></div>
         </div>

         <SummonCrosshair />
      </>}

      {isPaused && !isDead ? <PauseScreen /> : null}

      <TechTree />
      <TechInfocard />

      <BuildMenu />

      <InventorySelector />

      <InspectHealthBar />
   </>;
}

export default GameScreen;