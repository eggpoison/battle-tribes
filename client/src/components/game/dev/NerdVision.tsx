import DebugInfo from "./DebugInfo";
import Terminal, { forceTerminalFocus, setTerminalVisibility } from "./Terminal";
import { useEffect, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import GameInfoDisplay from "./GameInfoDisplay";
import { setTerminalButtonOpened } from "./TerminalButton";
import { hideFrameGraph, showFrameGraph } from "./FrameGraph";
import TabSelector from "./TabSelector";
import { addMenuCloseFunction } from "../../../menus";

export let nerdVisionIsVisible: () => boolean = () => false;

const NerdVision = () => {
   const [terminalStartingVisibility, setTerminalStartingVisibility] = useState(false);
   const [isEnabled, setIsEnabled] = useState(false); // Nerd vision always starts as disabled
   const [menu, setMenu] = useState<JSX.Element | null>(null);

   const setMenuCallback = (element: JSX.Element): void => {
      setMenu(element);

      addMenuCloseFunction(() => {
         setMenu(null);
      });
   }

   useEffect(() => {
      addKeyListener("~", (e: KeyboardEvent) => {
         e.preventDefault();
         
         setTerminalStartingVisibility(true);
         showFrameGraph();

         if (isEnabled) {
            setTerminalVisibility(true);
            forceTerminalFocus();
            setTerminalButtonOpened(true);
         } else {
            setIsEnabled(true);
         }
      }, "terminal_quick_open");
   }, [isEnabled]);

   useEffect(() => {
      nerdVisionIsVisible = () => isEnabled;
   }, [isEnabled])
   
   // Toggle nerd vision when the back quote key is pressed
   useEffect(() => {
      addKeyListener("`", () => {
         if (!isEnabled) {
            showFrameGraph();
         } else {
            hideFrameGraph();
         }
         
         setTerminalStartingVisibility(false);
         setIsEnabled(!isEnabled);
      }, "dev_view_is_enabled");
   }, [isEnabled]);

   if (!isEnabled) return null;

   return <div id="nerd-vision-wrapper">
      <GameInfoDisplay />
      <DebugInfo />
      {/* <TerminalButton startingIsOpened={terminalStartingVisibility} /> */}
      <Terminal startingIsVisible={terminalStartingVisibility}/>

      <TabSelector setMenu={setMenuCallback} />

      {menu}
   </div>;
}

export default NerdVision;