import Point from "@arcgis/core/geometry/Point";

export interface NearestPointResult {
    /** The point geometry of the coordinate. Includes x, y, and spatialReference properties. */
    coordinate: Point;

    /** The distance from the coordinate to the input point */
    distance: number;

    /** When true, the coordinate is to the right of the geometry. */
    isRightSide: boolean;

    /** The index of the coordinate. */
    vertexIndex: number;

    /** When true, the result is empty. */
    isEmpty: boolean;
}