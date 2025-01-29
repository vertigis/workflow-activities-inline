import { type RouteInfo } from "./RouteInfo";

/** The information that describes a station point. */
export interface StationInfo {
    routeInfo: RouteInfo;
    /**
     * Station values are purely for data display.  Do not use for calculation.
     */
    station?: number;
    measure: number;
    pointJSON?: any;
    stationFeature?: { [featureAttributes: string]: string | number };
}
