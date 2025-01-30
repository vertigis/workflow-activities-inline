export type MeasureUnits =
    | "meters"
    | "feet"
    | "kilometers"
    | "miles"
    | "nautical-miles"
    | "yards";

/** The linear referencing configuration. */
export interface LinearReferencingConfig {
    /** The map service that contains the centerline layer. */
    mapService?: string;

    /** The layer on the map service that contains the centerline data. */
    centerlineLayer?: string;

    /** The number of numbers to appear after the + in station notation. */
    stationDecimalPlaces?: number;

    /** The number of decimal places to round to when displaying station/measure values. */
    decimalPlaces: number;

    /** A Boolean defining whether or not to include the '+' symbol in station the display of values. */
    useStationNotation: boolean;

    /** The url to the geometryService. */
    geometryServiceUrl: string;

    /** RUNTIME ONLY. Calculated value used to query against the centerline. */
    centerlineUrl?: string;

    /** The route id field of the route layer. */
    routeIdField: string;

    /** This is discovered at startup, can be configured by the admin. */
    routeIdFieldType: string;

    /** The route name field of the route layer. */
    routeNameField: string;

    /** The additional field value used in advanced route selection options. */
    routeSelectorAdditionalField: string;

    /** Type of the additions route selection field. */
    routeSelectorAdditionalFieldType: string;

    /** Functions sting used in advanced route selection field value. */
    routeSelectorAdditionalFieldFunction?: string;

    /** The series field of the route layer.  (optional. may only be used for search forms)  */
    routeSeriesField: string;

    /** The unit of measure of the m-values on the segments layer.
     *  meters | feet | kilometers | miles | yards
     */
    segmentsMeasureUnit: MeasureUnits;

    /** Sets whether to use begin station and end station attributes of the feature to calculate station.
     *   Used when the m-value of the feature is different from the station value.
     *   If false, it will just use the m-value of the feature.
     */
    calculateStationUsingAttributes: boolean;

    /** The Begin Station field of the segments layer. For use with calculateStationUsingAttributes=true */
    segmentsBeginStationField: string;

    /** The End Station field of the segments layer. For use with calculateStationUsingAttributes=true */
    segmentsEndStationField: string;

    /** The root where the templates are located. */
    templatesRoot?: string;

    /** Field that points to the next route. */
    nextRouteField?: string;

    /** Field that points to the previous route. */
    previousRouteField?: string;

    /** The version of the map service to use. */
    gdbVersion?: string;
}
