import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import Graphic from "@arcgis/core/Graphic";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import { LinearReferencingConfig } from "../models/LinearReferencingConfig";
import { NearestPointResult } from "../models/NearestPointResult";
import { queryForSegments } from "./queryUtils";
import { StationInfo } from "../models/StationInfo";

/**
 * Extracts M values from a set of coordinates within a given feature set.
 *
 * @param inlineManager - An object containing linear referencing configuration and current route information.
 * @param featureSet - A collection of features from which to extract coordinate values.
 * @param xField - The name of the field representing the X coordinate in the feature attributes.
 * @param yField - The name of the field representing the Y coordinate in the feature attributes.
 * @param inSpatialReference - The spatial reference of the input coordinates.
 * @param mValueFieldName - The name of the field where the M values will be stored.
 */
export async function calculateMValuesFromCoordinates(
    inlineManager: any,
    featureSet: FeatureSet,
    useGeometry: boolean,
    xField: string,
    yField: string,
    inSpatialReference: SpatialReference,
    mValueFieldName: string,
) {
    const lrs =
        inlineManager.linearReferencingConfig as LinearReferencingConfig;
    const routeId = inlineManager.currentRoute.routeId as string;
    const outSR = inlineManager.spatialReference as SpatialReference;

    const newFeatureSet = new FeatureSet();

    // Get the graphics for the current selected Inline route.
    const routeSegments = await getSegmentsForRoute(lrs, routeId, outSR);
    for (const feature of featureSet.features) {
        const newFeature = setMValueForFeature(
            inlineManager,
            routeSegments,
            feature,
            useGeometry,
            xField,
            yField,
            inSpatialReference,
            mValueFieldName,
        );
        if (newFeature) {
            newFeatureSet.features.push(newFeature);
        }
    }

    return newFeatureSet;
}

function setMValueForFeature(
    inlineManager: any,
    routeSegments: FeatureSet,
    feature: Graphic,
    useGeometry: boolean,
    xField: string,
    yField: string,
    inSpatialReference: SpatialReference,
    mValueFieldName: string,
): Graphic | null {
    const xValue = useGeometry
        ? (feature.geometry as Point).x
        : feature.attributes[xField];
    const yValue = useGeometry
        ? (feature.geometry as Point).y
        : feature.attributes[yField];
    const outSpatialReference =
        inlineManager.spatialReference as SpatialReference;
    const point = new Point({
        longitude: xValue,
        latitude: yValue,
        spatialReference: inSpatialReference,
    });

    // Find the closest feature to the current point along the route.
    const closestGraphic = findClosestFeature(routeSegments.features, point);

    // Get the measure info from the closest feature.
    const measure = calculateMeasureFromPoint(
        point,
        closestGraphic,
        outSpatialReference,
    );

    if (measure == null) {
        return null;
    }

    feature.attributes[mValueFieldName] = measure;

    return feature;
}

/**
 * Retrieves all segments for a specified route using linear referencing configuration.
 *
 * @param linearReferencingConfig - Configuration object for linear referencing.
 * @param routeId - Identifier for the route whose segments are to be retrieved.
 * @param spatialReference - The spatial reference for the query.
 * @returns A promise that resolves to a FeatureSet containing the segments of the route.
 * @throws An error if no segments are found or if the query fails.
 */
export async function getSegmentsForRoute(
    linearReferencingConfig: LinearReferencingConfig,
    routeId: string,
    spatialReference: SpatialReference,
): Promise<FeatureSet> {
    try {
        // Query for all the segments of this route
        const result = await queryForSegments(
            linearReferencingConfig,
            routeId,
            spatialReference,
        );

        if (result.features.length === 0) {
            const msg = `No segments found for route id "${routeId}".`;
            throw new Error(msg);
        }

        return result;
    } catch (error: any) {
        const msg = `Query for segments failed: ${error.message}`;
        throw new Error(msg);
    }
}

function findClosestFeature(
    features: __esri.Graphic[],
    point: __esri.Point,
): __esri.Graphic {
    if (features.length === 0) {
        throw new Error("Invalid argument. Feature count = 0");
    }

    if (features.length === 1) {
        return features[0];
    }

    let nearestPoint: NearestPointResult | null = null;
    let nearestGraphic: __esri.Graphic | null = null;

    // Find the closest graphic
    for (let i = 0, il = features.length; i < il; i++) {
        const graphic = features[i];

        if (graphic.geometry) {
            const newPoint = geometryEngine.nearestCoordinate(
                graphic.geometry,
                point,
            );

            // Check if this graphic is closer
            if (!newPoint.isEmpty) {
                if (nearestPoint == null) {
                    nearestPoint = newPoint as NearestPointResult;
                    nearestGraphic = graphic;
                } else if (nearestPoint.distance > newPoint.distance) {
                    nearestPoint = newPoint as NearestPointResult;
                    nearestGraphic = graphic;
                }
            }
        }
    }

    if (nearestGraphic == null) {
        throw new Error("Nearest feature was not found.");
    }

    return nearestGraphic;
}

/**
 * Find the segment of the esri polyline that contains the given measure value.
 * @param measureValue
 * @param polyline
 */
export function findLineSegmentThatContainsMeasure(
    measureValue: number,
    polyline: __esri.Polyline,
): LineSegment {
    const numberOfVertices = getNumberOfVertex(polyline);
    let lastPoint: __esri.Point = getPointAtVertex(0, polyline);

    let reversed = false;

    // This polyline could be reversed if the sought measure value is less than the measure value of the first pt.
    // If this happens we'll need to check for the segment backwards i.e. from the last point to the first point.
    if (lastPoint.m > measureValue) {
        lastPoint = getPointAtVertex(numberOfVertices - 1, polyline);
        if (lastPoint.m > measureValue) {
            throw new Error(
                "Measure value not found in the supplied polyline.",
            );
        }

        reversed = true;
    }

    let currentPoint;

    if (reversed) {
        for (let i = numberOfVertices - 2; i >= 0; i--) {
            currentPoint = getPointAtVertex(i, polyline);
            if (currentPoint.m! >= measureValue) {
                return <LineSegment>{
                    startPoint: lastPoint,
                    endPoint: currentPoint,
                };
            }
            lastPoint = currentPoint;
        }
        lastPoint = getPointAtVertex(numberOfVertices - 1, polyline);
        currentPoint = getPointAtVertex(numberOfVertices - 2, polyline);
    } else {
        for (let i = 1; i < numberOfVertices; i++) {
            currentPoint = getPointAtVertex(i, polyline);
            if (currentPoint.m! >= measureValue) {
                return <LineSegment>{
                    startPoint: lastPoint,
                    endPoint: currentPoint,
                };
            }
            lastPoint = currentPoint;
        }
    }

    // If no point is found return the last point
    return <LineSegment>{ startPoint: lastPoint, endPoint: currentPoint };
}

function calculateMeasureFromPoint(
    point: __esri.Point,
    nearestSegmentFeature: __esri.Graphic,
    spatialReference: __esri.SpatialReference,
): number | null {
    const nearestPoint = geometryEngine.nearestCoordinate(
        nearestSegmentFeature.geometry,
        point,
    ) as NearestPointResult;

    const nearestVertex = geometryEngine.nearestVertex(
        nearestSegmentFeature.geometry,
        nearestPoint.coordinate,
    ) as NearestPointResult;

    // Is this is a vertex?
    const isVertex =
        nearestPoint.coordinate.x === nearestVertex.coordinate.x &&
        nearestPoint.coordinate.y === nearestVertex.coordinate.y;

    const containingSegment = findAdjacentVertices(
        nearestSegmentFeature.toJSON(),
        nearestPoint.vertexIndex,
    );

    // If this is a vertex, no interpolation needed.
    if (isVertex) {
        const stationPoint = getPointAtVertex(
            nearestVertex.vertexIndex,
            nearestSegmentFeature.geometry as Polyline,
        );

        return stationPoint.m;

        // Interpolate
    } else {
        const mapSR = spatialReference;

        // Calculate offset in feet
        const elasticLine = new Polyline();
        elasticLine.spatialReference = mapSR;
        elasticLine.addPath([nearestPoint.coordinate, point]);

        // Make the transformation from measure to point a bijection by doing the same process
        // as in createPointAtTargetMeasure() in reverse.
        // We can arbitrarily choose to use the x coordinate for MeasurePercent here because geometrically speaking
        // there is no difference between using the x or y, so the only discrepancy should be floating point error (small).
        const measurePercent =
            (nearestPoint.coordinate.x - containingSegment.startPoint.x) /
            (containingSegment.endPoint.x - containingSegment.startPoint.x);
        const segmentLength =
            containingSegment.endPoint.m - containingSegment.startPoint.m;
        const measure =
            segmentLength * measurePercent + containingSegment.startPoint.m;

        return measure;
    }
}

/**
 * Find the vertices of the polyline that encapsulate the point of interest
 */
function findAdjacentVertices(
    containingFeatureJSON,
    vertexIndex: number,
): LineSegment {
    const polyline: __esri.Polyline = Graphic.fromJSON(containingFeatureJSON)
        .geometry as __esri.Polyline;

    const nearestVertexPoint: __esri.Point = getPointAtVertex(
        vertexIndex,
        polyline,
    );

    /* Note:  measureInfo.nearestPoint.vertexIndex seems to always be the previous vertex in the polyline.
     * in which case we can just return a line segment with vertexIndex +1 as the endPoint.  Then we don't need all the
     * code to determine the containing segment
     */
    const startVertex = nearestVertexPoint;

    // Get the desired path/vertex (Esri's nearestCoordinate geometryEngine method never returns the last vertex. So vertexIndex + 1 should never be out of bounds.)
    const pathVertexInfo = getPathIndexForVertexIndex(
        vertexIndex + 1,
        polyline,
    );

    const vertex =
        polyline.paths[pathVertexInfo.pathIndex][pathVertexInfo.vertexIndex];
    // If the Z value exists within the vertex it is the 3rd value in the object, with M being the 4th.
    // If no Z value present, it does not exist in the vertex and therefore the M value is the 3rd value in the object.
    const vertexHasZ = vertex.length === 4;
    const endVertex = Point.fromJSON({
        spatialReference: polyline.spatialReference,
        hasZ: vertexHasZ,
        x: vertex[0],
        y: vertex[1],
        m: vertexHasZ ? vertex[3] : vertex[2],
        z: vertexHasZ ? vertex[2] : undefined,
    });
    return { startPoint: startVertex, endPoint: endVertex };
}

/**
 * Given a vertex index, get the point including m-value at that index
 * @param vertexIndex The vertex along a line that will be used to calculate the m value.
 * @param geometry The polyline that the vertex is found in.
 */
export function getPointAtVertex(
    vertexIndex: number,
    geometry: __esri.Polyline,
): __esri.Point {
    const polyline = geometry;

    // We require at least 1 part. If there are multiparts, we'll only use the first part.
    if (polyline.paths.length < 1) {
        throw new Error("Multipart polylines requires at least 1 part.");
    }

    // Get the desired path
    const pathVertexInfo = getPathIndexForVertexIndex(vertexIndex, geometry);
    const vertex =
        polyline.paths[pathVertexInfo.pathIndex][pathVertexInfo.vertexIndex];
    // If the Z value exists within the vertex it is the 3rd value in the object, with M being the 4th.
    // If no Z value present, it does not exist in the vertex and therefore the M value is the 3rd value in the object.
    const vertexHasZ = vertex.length === 4;
    const point = Point.fromJSON({
        spatialReference: polyline.spatialReference,
        x: vertex[0],
        y: vertex[1],
        m: vertexHasZ ? vertex[3] : vertex[2],
        z: vertexHasZ ? vertex[2] : undefined,
    });
    return point;
}

/**
 * Return the path and index that match the vertexIndex.
 * @param vertexIndex Desired vertex index
 * @param geometry Geometry containing the multipart
 */
function getPathIndexForVertexIndex(
    vertexIndex: number,
    geometry: __esri.Polyline,
): PathAndVertexInfo {
    let cumulative = 0;

    for (let i = 0, il = geometry.paths.length; i < il; i++) {
        cumulative += geometry.paths[i].length;

        if (cumulative > vertexIndex) {
            return {
                pathIndex: i,
                vertexIndex:
                    vertexIndex - cumulative + geometry.paths[i].length,
            };
        }
    }

    // Fallback
    return {
        pathIndex: 0,
        vertexIndex: vertexIndex,
    };
}

/**
 * Use the m-values of the polyline to determine the length.
 * @param geometry the polyline that includes m values.
 */
export function getLengthOfLineUsingMValue(geometry: __esri.Polyline): number {
    const startPoint = getPointAtVertex(0, geometry);
    const endPoint = getPointAtVertex(
        geometry.paths[geometry.paths.length - 1].length - 1,
        geometry,
    );

    if (!startPoint.hasM || !endPoint.hasM) {
        throw new Error("getLengthOfLine: Polyline does not contain M values");
    }
    return Math.abs(endPoint.m - startPoint.m);
}

/**
 * Return the total number of vertices in a multipart polyline.
 * @param geometry the polyline
 */
export function getNumberOfVertex(geometry: __esri.Polyline): number {
    let cumulative = 0;

    geometry.paths.forEach((path) => {
        cumulative += path.length;
    });

    return cumulative;
} /**
 * Trim the provided featureSet to the selected range.
 * @param featureSet The featureSet to be modified.
 * @param start The minimum m value.
 * @param end The maximum m value.
 * @param config The linear referencing config that describes the inline view.
 */
export function trimFeatureSetToRange(
    featureSet: __esri.FeatureSet,
    start: number,
    end: number,
    config: LinearReferencingConfig,
): void {
    if (
        !featureSet ||
        featureSet.features.length === 0 ||
        !(<any>featureSet).hasM
    ) {
        return;
    }

    // The start value should always be the smallest.
    if (start > end) {
        [start, end] = [end, start];
    }

    // The position of the M value in a coordinate array
    let mPosition = 2;

    // If there are Z values, then the M position is pushed by 1
    if ((<any>featureSet).hasZ) {
        mPosition = 3;
    }

    // First remove features that are completely outside the range
    for (let i = featureSet.features.length - 1; i >= 0; i--) {
        const feature = featureSet.features[i];
        const geometry = <__esri.Polyline>feature.geometry;

        // Track if the measure values are going forward or backward.
        let reversedMeasures: boolean = false;

        let startOfFullRoute: number;
        let endOfFullRoute: number;

        if (config.calculateStationUsingAttributes) {
            // The start station should be the smallest and the end station should be the largest value.
            startOfFullRoute =
                feature.attributes[config.segmentsBeginStationField];
            endOfFullRoute = feature.attributes[config.segmentsEndStationField];
        } else {
            startOfFullRoute = getPointAtVertex(0, geometry).m!;
            endOfFullRoute = getPointAtVertex(
                getNumberOfVertex(geometry) - 1,
                geometry,
            ).m!;
        }

        // The start should be the smallest and the end should be the largest point.
        if (startOfFullRoute > endOfFullRoute) {
            [startOfFullRoute, endOfFullRoute] = [
                endOfFullRoute,
                startOfFullRoute,
            ];
            reversedMeasures = true;
        }

        const isFullSelectionBeforeStart =
            startOfFullRoute < start && endOfFullRoute < start;
        const isFullSelectionAfterEnd =
            startOfFullRoute > end && endOfFullRoute > end;

        if (isFullSelectionBeforeStart || isFullSelectionAfterEnd) {
            featureSet.features.splice(i, 1);
            continue;
        }

        const removeSegmentsForwards = (point: number) => {
            const stationPoint = getStationInfoFromSegment(
                point,
                feature,
                config,
            );
            const measureStart = stationPoint.measure;

            // Loop through each Path
            for (let j = 0, jl = geometry.paths.length; j < jl; j++) {
                const path = geometry.paths[j];
                let itemsToRemove = 0;

                // Loop through the coordinates of a path to remove item less than the start
                for (let k = 0, kl = path.length - 1; k < kl; k++) {
                    const coordinates = path[k];
                    const nextCoordinates = path[k + 1];

                    if (
                        (!reversedMeasures &&
                            coordinates[mPosition] < measureStart) ||
                        (reversedMeasures &&
                            coordinates[mPosition] > measureStart)
                    ) {
                        // If next coordinate is also less than the measure, we want to remove the coordinates
                        if (
                            (!reversedMeasures &&
                                nextCoordinates[mPosition] < measureStart) ||
                            (reversedMeasures &&
                                nextCoordinates[mPosition] > measureStart)
                        ) {
                            // We're not going to remove the item inside the loop, we'll do it after
                            itemsToRemove++;
                            // Else we need to adjust the coordinates
                        } else {
                            if (nextCoordinates[mPosition] === measureStart) {
                                // No adjustment needed. next coordinate is the start point.
                                itemsToRemove++;
                            } else {
                                coordinates[0] = stationPoint.pointJSON.x;
                                coordinates[1] = stationPoint.pointJSON.y;
                                coordinates[mPosition] = measureStart;
                            }
                            break;
                        }
                    } else {
                        break;
                    }
                }

                /* Case: 24619-Incorrect zoom behavior on multipart features.
                 * The above loop could be removing all the points from the path except one. Check if that is the case
                 * and just remove the single point from the path. A path with one point doesn't make sense.
                 */
                if (itemsToRemove === path.length - 1) {
                    itemsToRemove++;
                }

                if (itemsToRemove) {
                    // Remove the element
                    path.splice(0, itemsToRemove);
                }

                // Must update the attributes as well
                if (config.calculateStationUsingAttributes) {
                    if (
                        feature.attributes[config.segmentsBeginStationField] <=
                        feature.attributes[config.segmentsEndStationField]
                    ) {
                        feature.attributes[config.segmentsBeginStationField] =
                            start;
                    } else {
                        feature.attributes[config.segmentsEndStationField] =
                            start;
                    }
                }
            }
        };

        const removeSegmentsBackwards = (point: number) => {
            const stationPoint = getStationInfoFromSegment(
                point,
                feature,
                config,
            );
            const measureEnd = stationPoint.measure;

            // Loop through each Path
            for (let j = 0, jl = geometry.paths.length; j < jl; j++) {
                const path = geometry.paths[j];
                let itemsToRemove = 0;

                // Loop through the coordinates of a path to remove item greater than the end
                for (let k = path.length - 1; k > 0; k--) {
                    const coordinates = path[k];
                    const previousCoordinates = path[k - 1];

                    if (
                        (!reversedMeasures &&
                            coordinates[mPosition] > measureEnd) ||
                        (reversedMeasures &&
                            coordinates[mPosition] < measureEnd)
                    ) {
                        // If previous coordinate is also more than the measure, we want to remove the coordinates
                        if (
                            (!reversedMeasures &&
                                previousCoordinates[mPosition] > measureEnd) ||
                            (reversedMeasures &&
                                previousCoordinates[mPosition] < measureEnd)
                        ) {
                            // We're not going to remove the item inside the loop, we'll do it after
                            itemsToRemove++;
                            // Else we need to adjust the coordinates
                        } else {
                            if (previousCoordinates[mPosition] === measureEnd) {
                                // No adjustment needed. Previous coordinate is the end point.
                                itemsToRemove++;
                            } else {
                                coordinates[0] = stationPoint.pointJSON.x;
                                coordinates[1] = stationPoint.pointJSON.y;
                                coordinates[mPosition] = measureEnd;
                            }
                            break;
                        }
                    } else {
                        break;
                    }
                }

                /* Case: 24619-Incorrect zoom behavior on multipart features.
                 * The above loop could be removing all the points from the path except the first one. Check if that is the case
                 * and just remove the single point from the path. A path with one point doesn't make sense.
                 */
                if (itemsToRemove === path.length - 1) {
                    itemsToRemove++;
                }

                if (itemsToRemove) {
                    // Remove the element
                    path.splice(path.length - itemsToRemove, itemsToRemove);
                }

                // Must update the attributes as well
                if (config.calculateStationUsingAttributes) {
                    if (
                        feature.attributes[config.segmentsBeginStationField] <=
                        feature.attributes[config.segmentsEndStationField]
                    ) {
                        feature.attributes[config.segmentsEndStationField] =
                            end;
                    } else {
                        feature.attributes[config.segmentsBeginStationField] =
                            end;
                    }
                }
            }
        };

        if (startOfFullRoute < start) {
            if (reversedMeasures) {
                removeSegmentsBackwards(start);
            } else {
                removeSegmentsForwards(start);
            }
        }

        if (endOfFullRoute > end) {
            if (reversedMeasures) {
                removeSegmentsForwards(end);
            } else {
                removeSegmentsBackwards(end);
            }
        }

        /* Case: 24619-Incorrect zoom behavior on multipart features.
         * Check the feature geometry and make sure we don't have empty paths.
         **/
        for (let k = geometry.paths.length - 1; k >= 0; k--) {
            if (geometry.paths[k].length === 0) {
                geometry.paths.splice(k, 1);
            }
        }
    }
}

/**
 * Extract StationInfo from a graphic.
 * @param station The location of interest we want the StationInfo for.
 * @param segment The graphic that contains the measure/station information.
 * @param config The linear referencing config that describes the inline view.
 */
function getStationInfoFromSegment(
    station: number,
    segment: Graphic,
    config: LinearReferencingConfig,
): StationInfo {
    let targetMeasure: number;

    // Just use the measure unless configured otherwise.
    if (!config.calculateStationUsingAttributes) {
        targetMeasure = station;
    } else {
        const startStation = Math.min(
            segment.attributes[config.segmentsBeginStationField] as number,
            segment.attributes[config.segmentsEndStationField] as number,
        );
        const endStation = Math.max(
            segment.attributes[config.segmentsBeginStationField] as number,
            segment.attributes[config.segmentsEndStationField] as number,
        );

        const stationLength = Math.abs(endStation - startStation);
        const relativeStationValue = station - startStation;
        const percent = relativeStationValue / (stationLength * 1.0);

        const lineLength = getLengthOfLineUsingMValue(
            <__esri.Polyline>segment.geometry,
        );
        const startMeasure = Math.min(
            getPointAtVertex(0, segment.geometry as __esri.Polyline).m,
            getPointAtVertex(
                getNumberOfVertex(segment.geometry as __esri.Polyline) - 1,
                segment.geometry as __esri.Polyline,
            ).m,
        );
        targetMeasure = lineLength * percent + startMeasure;
    }

    // Need to find the coordinate of the target measure
    const lineSegment = findLineSegmentThatContainsMeasure(
        targetMeasure,
        <__esri.Polyline>segment.geometry,
    );

    // ensure the target measure is on the line
    const min = Math.min(lineSegment.startPoint.m, lineSegment.endPoint.m);
    const max = Math.max(lineSegment.startPoint.m, lineSegment.endPoint.m);

    targetMeasure = clamp(targetMeasure, min, max);
    const targetPoint = createPointAtTargetMeasure(targetMeasure, lineSegment);
    const result = {
        measure: targetMeasure,
        pointJSON: targetPoint.toJSON(),
    } as StationInfo;

    return result;
}

/**
 * Given a measure value and a line segment that contains the measure value, get the coordinate.
 * @param targetMeasure the measure value where to create the point.
 * @param lineSegment the line segment along which the point will be created.
 */
export function createPointAtTargetMeasure(
    targetMeasure: number,
    lineSegment: LineSegment,
): __esri.Point {
    if (
        targetMeasure < lineSegment.startPoint.m ||
        targetMeasure > lineSegment.endPoint.m
    ) {
        throw new Error(
            "Measure value not contained in the supplied lineSegment.",
        );
    }

    if (lineSegment.startPoint.m === targetMeasure) {
        return new Point({
            x: lineSegment.startPoint.x,
            y: lineSegment.startPoint.y,
            z: lineSegment.startPoint.z,
            spatialReference: lineSegment.startPoint.spatialReference,
        });
    } else if (lineSegment.endPoint.m === targetMeasure) {
        return new Point({
            x: lineSegment.endPoint.x,
            y: lineSegment.endPoint.y,
            z: lineSegment.startPoint.z,
            spatialReference: lineSegment.endPoint.spatialReference,
        });
    } else {
        const segmentLength = lineSegment.endPoint.m - lineSegment.startPoint.m;
        const measurePercent =
            (targetMeasure - lineSegment.startPoint.m) / segmentLength;
        const x =
            (lineSegment.endPoint.x - lineSegment.startPoint.x) *
                measurePercent +
            lineSegment.startPoint.x;
        const y =
            (lineSegment.endPoint.y - lineSegment.startPoint.y) *
                measurePercent +
            lineSegment.startPoint.y;
        return new Point({
            x: x,
            y: y,
            z: lineSegment.startPoint.z,
            spatialReference: lineSegment.startPoint.spatialReference,
        });
    }
}

/**
 * Restricts a value to be within a specified range.
 * @param value The value to clamp
 * @param min The minimum value. If value is less than min, min will be returned
 * @param max The maximum value. If value is greater than max, max will be returned
 */
function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    }
    return value;
}

/** A straight line made up of two points. */
export interface LineSegment {
    startPoint: __esri.Point;
    endPoint: __esri.Point;
}

interface PathAndVertexInfo {
    /** The path index. */
    pathIndex: number;

    /** The index inside the path. */
    vertexIndex: number;
}
