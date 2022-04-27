import { generatePerlinNoise } from "./perlin-noise";
import { getTileType, TileType } from "./tiles";

export function generateBoard(boardDimensions: number): Array<Array<TileType>> {
    const HEIGHT_SCALE = 5;
    const TEMPERATURE_SCALE = 35;
    const HUMIDITY_SCALE = 10;

    // Generate the noise
    const heightMap = generatePerlinNoise(boardDimensions, boardDimensions, HEIGHT_SCALE);
    const temperatureMap = generatePerlinNoise(boardDimensions, boardDimensions, TEMPERATURE_SCALE);
    const humidityMap = generatePerlinNoise(boardDimensions, boardDimensions, HUMIDITY_SCALE);

    // Initialise the tiles array
    const tiles = new Array<Array<TileType>>(boardDimensions);
    for (let x = 0; x < boardDimensions; x++) {
        tiles[x] = new Array<TileType>(boardDimensions);

        // Fill the tile array using the noise
        for (let y = 0; y < boardDimensions; y++) {
            const height = heightMap[x][y];
            const temperature = temperatureMap[x][y];
            const humidity = humidityMap[x][y];

            const tileType = getTileType(height, temperature, humidity);
            tiles[x][y] = tileType;
        }
    }

    return tiles;
}