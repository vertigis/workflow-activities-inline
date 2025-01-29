import type { IActivityHandler } from "@vertigis/workflow";
import { getSegmentsForRoute } from "../utils/geometryUtils";
import { LinearReferencingConfig } from "../models/LinearReferencingConfig";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import { trimFeatureSetToRange } from "../utils/geometryUtils";

/** An interface that defines the inputs of the activity. */
interface GetCurrentRouteGeometryInputs {
    /**
     * The Inline Manager of the current instance of VertiGIS Inline.
     * 
     * @displayName Inline Manager
     * @description The Inline Manager of the current instance of VertiGIS Inline.
     * @required
     */
    inlineManager: any;

    /**
     * Whether to trim the geometry to the current range or return the entire route. Default is false.
     * 
     * @displayName Trim To Range
     * @description Whether to trim the geometry to the current range or return the entire route. Default is false.
     */
    trimToRange: boolean;
}

/** An interface that defines the outputs of the activity. */
interface GetCurrentRouteGeometryOutputs {
    /**
     * @description The result of the activity.
     */
    geometry: __esri.Geometry | __esri.Geometry[];
}

/**
 * @displayName Get Current Route Geometry
 * @category VertiGIS Inline
 * @description Get the geometry of the current highlighted route.
 */
export default class GetCurrentRouteGeometryActivity implements IActivityHandler {
    /** Perform the execution logic of the activity. */
    async execute(inputs: GetCurrentRouteGeometryInputs): Promise<GetCurrentRouteGeometryOutputs> {
        const lrs = inputs.inlineManager.linearReferencingConfig as LinearReferencingConfig;
        const sr = inputs.inlineManager.spatialReference as SpatialReference;
        const routeId = inputs.inlineManager.currentRoute.routeId as string;

        const route = await getSegmentsForRoute(lrs, routeId, sr);

        if (inputs.trimToRange) {
            const start = inputs.inlineManager.currentRange.beginStation.measure as number;
            const end = inputs.inlineManager.currentRange.endStation.measure as number;
            
            trimFeatureSetToRange(route, start, end, lrs)
        }

        // The response will have one feature.  We need the geometry included with that feature.
        return { geometry: route.features[0].geometry };
    }
}
