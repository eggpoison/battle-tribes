export enum TileType {
   grass
}

interface TileInfo {
   colour: string;
}

const TILE_INFO: { [key in TileType]: TileInfo } = {
   [TileType.grass]: {
      colour: "green"
   }
};

export default TILE_INFO;