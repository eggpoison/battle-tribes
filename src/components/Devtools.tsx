import React, { useEffect, useState } from "react";
import OPTIONS from "../options";

export let toggleDevtoolsVisibility: (newVisibility: boolean) => void;

function Devtools() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        toggleDevtoolsVisibility = (newVisibility: boolean) => {
            setIsVisible(newVisibility);
        }
    });

    const updateShowChunkBordersOption = (e: React.ChangeEvent) => {
        OPTIONS.showChunkBorders = (e.target as HTMLInputElement).checked;
    }

    return isVisible ? null : (
        <div id="devtools">
            <label>
                Show Chunk Borders
                <input type="checkbox" defaultChecked={false} onChange={e => updateShowChunkBordersOption(e)} />
            </label>
        </div>
    );
}

export default Devtools;