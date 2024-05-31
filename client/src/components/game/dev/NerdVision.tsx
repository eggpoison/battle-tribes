import DebugInfo from "./DebugInfo";
import Terminal, { forceTerminalFocus, setTerminalVisibility } from "./Terminal";
import { useCallback, useEffect, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import GameInfoDisplay from "./GameInfoDisplay";
import { setTerminalButtonOpened } from "./TerminalButton";
import { hideFrameGraph, showFrameGraph } from "./FrameGraph";
import ItemsTab from "./tabs/ItemsTab";
import SummonTab from "./tabs/SummonTab";
import { setMenuCloseFunction } from "../../../player-input";

const enum TabType {
   items,
   summon
}

interface TabInfo {
   readonly text: string;
   readonly image: string;
}

const TAB_INFO_RECORD: Record<TabType, TabInfo> = {
   [TabType.items]: {
      text: "Items",
      image: require("../../../images/ui/item-tab.png")
   },
   [TabType.summon]: {
      text: "Summon",
      image: require("../../../images/ui/summon-tab.png")
   }
};

export let nerdVisionIsVisible: () => boolean = () => false;

interface TabProps {
   readonly tabType: TabType;
   readonly selectedTabType: TabType | null;
   onClick(e: React.MouseEvent, tabType: TabType): void;
}

const Tab = (props: TabProps) => {
   const tabInfo = TAB_INFO_RECORD[props.tabType];
   const isSelected = props.tabType === props.selectedTabType;
   
   let className = "tab-selector devmode-container";
   if (isSelected) {
      className += " selected";
   }
   
   // return <div className={className} onMouseDown={() => props.onClick(props.tabType)}>
   return <div className={className} onMouseDown={(e) => props.onClick(e, props.tabType)}>
      <img src={tabInfo.image} alt="" />
      <span>{tabInfo.text}</span>
   </div>;
}

const Tabs = () => {
   const [selectedTab, setSelectedTab] = useState<TabType | null>(null);

   useEffect(() => {
      if (selectedTab !== null) {
         setMenuCloseFunction(() => {
            setSelectedTab(null);
         });
      }
   }, [selectedTab]);
   
   const updateSelectedTab = useCallback((e: React.MouseEvent, clickedTab: TabType): void => {
      // If clicked tab was the currently selected tab, clear the selected tab
      if (selectedTab === clickedTab) {
         setSelectedTab(null);
      } else {
         // Otherwise, select the clicked tab.
         setSelectedTab(clickedTab);

         // If not here, the items tab autofocus won't work
         e.preventDefault();
      }
   }, [selectedTab]);

   return <>
      {selectedTab === TabType.items ? (
         <ItemsTab />
      ) : selectedTab === TabType.summon ? (
         <SummonTab />
      ) : undefined}
   
      <div id="tab-selection">
         <Tab tabType={TabType.items}  selectedTabType={selectedTab} onClick={updateSelectedTab} />
         <Tab tabType={TabType.summon} selectedTabType={selectedTab} onClick={updateSelectedTab} />
      </div>
   </>;
}

const NerdVision = () => {
   const [terminalStartingVisibility, setTerminalStartingVisibility] = useState(false);
   const [isEnabled, setIsEnabled] = useState(false); // Nerd vision always starts as disabled

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

      <Tabs />
   </div>;
}

export default NerdVision;