import React, { useEffect, useState } from "react";
import OPTIONS from "../options";

export let toggleDevtoolsVisibility: () => void;

function Devtools() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        toggleDevtoolsVisibility = () => {
            const newVisibility = isVisible ? false : true;
            setIsVisible(newVisibility);
        }
    });

    const updateShowChunkBordersOption = (e: React.ChangeEvent) => {
        OPTIONS.showChunkBorders = (e.target as HTMLInputElement).checked;
    }

    return isVisible ? (
        <div id="devtools">
            <label>
                Show Chunk Borders
                <input type="checkbox" defaultChecked={false} onChange={e => updateShowChunkBordersOption(e)} />
            </label>
        </div>
    ) : null;
}

export default Devtools;