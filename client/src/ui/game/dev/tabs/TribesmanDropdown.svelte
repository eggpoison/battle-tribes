import { Entity } from "../../../../../../shared/src/entities";
import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
import { ExtendedTribe } from "../../../../game/tribes";

interface TribesmanAssignmentDropdownProps {
   readonly tribe: ExtendedTribe;
   onSelectEntity(entity: Entity | null): void;
}

const TribesmanAssignmentDropdown = (props: TribesmanAssignmentDropdownProps) => {
   const onChange = (e: Event): void => {
      const selectedValue = Number((e.target! as HTMLSelectElement).value) as Entity;
      props.onSelectEntity(selectedValue !== 0 ? selectedValue : null)
   }
   
   return <div className="dropdown" onChange={e => onChange(e.nativeEvent)}>
      <select>
         <option value={0}>None</option>
         {props.tribe.tribesmen.map((tribesman, i) => {
            return <option key={i} value={tribesman.entity}>{tribesman.name}, {CLIENT_ENTITY_INFO_RECORD[tribesman.entityType].name}</option>
         })}
      </select>
   </div>;
}

export default TribesmanAssignmentDropdown;