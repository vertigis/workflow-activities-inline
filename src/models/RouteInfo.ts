/** The information that describes a route. */
export interface RouteInfo {
    /** The route id. */
    routeId: string | number;

    /** The name route or line name */
    routeName: string;

    /** Additional field to be added to route select dropdown options. */
    routeAdditionalField?: string;

    /** Function used in place of an additional field in the route select options. */
    routeAdditionalFunction?: string;

    /** Route measure info used to populate range string and fill whole route range. */
    routeMeasureInfo?: FeatureSetBoundary;

    /** The ID for the previous route to jump to. */
    previousRouteId?: string;

    /** The ID for the next route to jump to. */
    nextRouteId?: string;
}

/** The start and end station values and points that bound the features. */
interface FeatureSetBoundary {
    min: number;

    minPoint: __esri.Point;

    max: number;

    maxPoint: __esri.Point;
}
