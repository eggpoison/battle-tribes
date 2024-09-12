import { TRIBESMAN_TITLE_RECORD, TribesmanTitle } from "battletribes-shared/titles";
import Client from "../../../client/Client";
import { CLIENT_TITLE_INFO_RECORD } from "../../../client-title-info";

interface TribesmanTitleInfocardProps {
   readonly titleOffer: TribesmanTitle;
}

const TribesmanTitleInfocard = (props: TribesmanTitleInfocardProps) => {
   const accept = (): void => {
      Client.respondToTitleOffer(props.titleOffer, true);
   }
   const reject = (): void => {
      Client.respondToTitleOffer(props.titleOffer, false);
   }
   
   const titleInfo = TRIBESMAN_TITLE_RECORD[props.titleOffer];
   const clientTitleInfo = CLIENT_TITLE_INFO_RECORD[props.titleOffer];
   
   return <div className="infocard sub-menu">
      <p className="center">You have received the {titleInfo.name} title! <i style={{color: "#aaa"}}>(Tier {titleInfo.tier})</i></p>

      <div className="bar"></div>

      <ul>
         {clientTitleInfo.effects.map((effectText, i) => (
            <li key={i}>{effectText}</li>
         ))}
      </ul>

      <div className="flex-container center">
         <button onClick={accept}>Accept</button>
         <button onClick={reject}>Reject</button>
      </div>
   </div>;
}

export default TribesmanTitleInfocard;