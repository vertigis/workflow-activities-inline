import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import request from "@arcgis/core/request";
import { executeQueryJSON } from "@arcgis/core/rest/query";
import Query from "@arcgis/core/rest/support/Query";
import { LinearReferencingConfig } from "../models/LinearReferencingConfig";

/**
 * Executes a query to retrieve segments based on the provided configuration and route ID.
 *
 * @param config - The configuration object containing linear referencing settings.
 * @param routeId - The ID of the route to query segments for.
 * @param spatialReference - The spatial reference to use for the query results.
 * @returns A promise that resolves to the features retrieved by the query.
 * @throws An error if the query transfer limit is exceeded.
 */
export async function queryForSegments(config: LinearReferencingConfig, routeId: string, spatialReference: SpatialReference) {
    const queryUrl = await createCenterlineQuery(config);

    const quote = getQuoteForFieldType(config.routeIdFieldType);

    const query = new Query();
    query.outSpatialReference = spatialReference;
    query.returnGeometry = true;
    query.where = config.routeIdField + " = " + quote + routeId + quote;
    query.outFields = getSegmentsFieldsFromConfig(config);
    config.gdbVersion && (query.gdbVersion = config.gdbVersion);

    const features = await executeQueryJSON(queryUrl, query);
    // Fail if transfer limit exceeded
    if (features.exceededTransferLimit) {
        throw new Error("Query transfer limit exceeded.");
    } else {
        return features;
    }
}

const getSegmentsFieldsFromConfig = (config: LinearReferencingConfig): string[] => {
    const outFields = getDistinctRouteInfoFieldsForSegments(config);

    if (config.segmentsBeginStationField) {
        outFields.push(config.segmentsBeginStationField);
    }

    if (config.segmentsEndStationField) {
        outFields.push(config.segmentsEndStationField);
    }

    return outFields;
};

const getDistinctRouteInfoFieldsForSegments = (config: LinearReferencingConfig): string[] => {
    const outFields: string[] = [];

    if (config.routeIdField) {
        outFields.push(config.routeIdField);
    }

    if (config.routeNameField) {
        outFields.push(config.routeNameField);
    }

    if (config.previousRouteField) {
        outFields.push(config.previousRouteField);
    }

    if (config.nextRouteField) {
        outFields.push(config.nextRouteField);
    }

    if (config.routeSelectorAdditionalField) {
        outFields.push(config.routeSelectorAdditionalField);
    }

    return outFields;
};

const getQuoteForFieldType = (fieldType: string): string => {
    let quote = "";

    if (
        fieldType === "esriFieldTypeString" ||
        fieldType === "esriFieldTypeGUID" ||
        fieldType === "esriFieldTypeGlobalID"
    ) {
        quote = "'";
    }

    return quote;
};

// Create a query task using the centerline config.  This is done to combat a
// race condition that can happen on initial load as well as when modifying the
// map service options.
const createCenterlineQuery = async (config: LinearReferencingConfig): Promise<string> => {
    let centerlineUrl = config.centerlineUrl;
    if (!centerlineUrl) {
        const mapServiceInfo = await getMapServiceLayers(config);
        centerlineUrl = getCenterlineUrl(config, mapServiceInfo);
    }
    return createCustomQueryUrl(centerlineUrl);
};

// Query the map service to get all the layers on the map service.
export async function getMapServiceLayers(
    config: any
): Promise<any> {
    if (config.mapService && config.centerlineLayer) {
        try {
            const response = await request(config.mapService + "/layers");
            if (response.data) {
                return response.data
            }
        } catch (error) {
            console.log(`Could not get layer info for ${config.mapService}`);
        }
    }
    return null;
}

// Use the map service to create the centerline layer url.
export function getCenterlineUrl(
    config: any,
    mapService: any
): string {
    const url: string = "";

    if (mapService?.layers && config.mapService && config.centerlineLayer) {
        for (const layer of mapService.layers) {
            if (layer.name === config.centerlineLayer) {
                return config.mapService + "/" + layer.id;
            }
        }
    }

    return url;
}

const createCustomQueryUrl = (url: string): string => {
    const query = "returnM=true&returnZ=true";
    url += url.indexOf("?") === -1 ? `?${query}` : `&${query}`;
    return url;
};