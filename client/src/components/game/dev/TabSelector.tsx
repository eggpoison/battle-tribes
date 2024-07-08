import { useState, useEffect, useCallback } from "react";
import ItemsTab from "./tabs/ItemsTab";
import SummonTab from "./tabs/SummonTab";
import TitlesTab from "./tabs/TitlesTab";
import TribesTab from "./tabs/TribesTab";
import { addMenuCloseFunction } from "../../../menus";

const enum TabType {
   items,
   summon,
   titles,
   tribes
}

interface TabInfo {
   readonly text: string;
   readonly image: string;
}

interface TabProps {
   readonly tabType: TabType;
   readonly selectedTabType: TabType | null;
   onClick(e: React.MouseEvent, tabType: TabType): void;
}

interface TabSelectorProps {
   setMenu(element: JSX.Element): void;
}

const TAB_INFO_RECORD: Record<TabType, TabInfo> = {
   [TabType.items]: {
      text: "Items",
      image: require("../../../images/ui/item-tab.png")
   },
   [TabType.summon]: {
      text: "Summon",
      image: require("../../../images/ui/summon-tab.png")
   },
   [TabType.titles]: {
      text: "Titles",
      image: require("../../../images/ui/titles-tab.png")
   },
   [TabType.tribes]: {
      text: "Tribes",
      image: require("../../../images/ui/tribes-tab.png")
   }
};

const Tab = (props: TabProps) => {
   const tabInfo = TAB_INFO_RECORD[props.tabType];
   const isSelected = props.tabType === props.selectedTabType;
   
   let className = "tab-selector devmode-container";
   if (isSelected) {
      className += " selected";
   }
   
   return <div className={className} onMouseDown={(e) => props.onClick(e, props.tabType)}>
      <img src={tabInfo.image} alt="" />
      <span>{tabInfo.text}</span>
   </div>;
}

const TabSelector = (props: TabSelectorProps) => {
   const [selectedTab, setSelectedTab] = useState<TabType | null>(null);

   useEffect(() => {
      if (selectedTab !== null) {
         addMenuCloseFunction(() => {
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
      {/* @Cleanup: robustness */}
      {selectedTab === TabType.items ? (
         <ItemsTab/>
      ) : selectedTab === TabType.summon ? (
         <SummonTab setMenu={props.setMenu} />
      ) : selectedTab === TabType.titles ? (
         <TitlesTab />
      ) : selectedTab === TabType.tribes ? (
         <TribesTab />
      ) : undefined }
   
      <div id="tab-selection">
         {/* @Cleanup: copy and paste */}
         <Tab tabType={TabType.items}  selectedTabType={selectedTab} onClick={updateSelectedTab} />
         <Tab tabType={TabType.summon} selectedTabType={selectedTab} onClick={updateSelectedTab} />
         <Tab tabType={TabType.titles} selectedTabType={selectedTab} onClick={updateSelectedTab} />
         <Tab tabType={TabType.tribes} selectedTabType={selectedTab} onClick={updateSelectedTab} />
      </div>
   </>;
}

export default TabSelector;