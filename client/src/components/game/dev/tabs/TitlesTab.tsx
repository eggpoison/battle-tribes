import { useEffect, useState } from "react";
import { NUM_TRIBESMAN_TITLES, TRIBESMAN_TITLE_RECORD, TribesmanTitle } from "battletribes-shared/titles";
import Client from "../../../../client/Client";

const enum ListType {
   add,
   remove
}

interface TitlesListProps {
   readonly titles: ReadonlyArray<TribesmanTitle>;
   readonly listType: ListType;
}

export let TitlesTab_setTitles: (titles: Array<TribesmanTitle>) => void = () => {};

const getUnclaimedTitles = (titles: ReadonlyArray<TribesmanTitle>): ReadonlyArray<TribesmanTitle> => {
   const unclaimedTitles = new Array<TribesmanTitle>();
   
   for (let title: TribesmanTitle = 0; title < NUM_TRIBESMAN_TITLES; title++) {
      if (!titles.includes(title)) {
         unclaimedTitles.push(title);
      }
   }

   return unclaimedTitles;
}

const TitlesList = (props: TitlesListProps) => {
   const onClick = (title: TribesmanTitle): void => {
      switch (props.listType) {
         case ListType.add: {
            Client.sendDevGiveTitlePacket(title);
            break;
         }
         case ListType.remove: {
            Client.sendDevRemoveTitlePacket(title);
            break;
         }
      }
   }
   
   return <div className="titles-list">
      {props.titles.map((title, i) => {
         const titleInfo = TRIBESMAN_TITLE_RECORD[title];
         return <div key={i}>
            <button onMouseDown={() => onClick(title)} key={i}>{titleInfo.name}</button>
         </div>;
      })}
   </div>
}

const TitlesTab = () => {
   const [titles, setTitles] = useState(new Array<TribesmanTitle>());

   useEffect(() => {
      // @Hack
      TitlesTab_setTitles = (titles: Array<TribesmanTitle>): void => {
         setTitles(titles);
      }
   }, []);

   const unclaimedTitles = getUnclaimedTitles(titles);
   
   return <div id="titles-tab" className="devmode-tab devmode-container">
      <div className="flex-container">
         <div className="devmode-menu-section">
            <h2 className="devmode-menu-section-title">Add</h2>
            <TitlesList listType={ListType.add} titles={unclaimedTitles} />
         </div>
         <div className="devmode-menu-section">
            <h2 className="devmode-menu-section-title">Remove</h2>
            <TitlesList listType={ListType.remove} titles={titles} />
         </div>
      </div>
   </div>;
}

export default TitlesTab;