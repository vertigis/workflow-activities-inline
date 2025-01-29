import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import type { IActivityHandler } from "@vertigis/workflow";
import { IActivityContext } from "@vertigis/workflow/IActivityHandler";
import { calculateMValuesFromCoordinates } from "../utils/geometryUtils";

export const DEFAULT_M_VALUE_FIELD = "_M_VALUE_FIELD_";

/** An interface that defines the inputs of the activity. */
interface GetMValuesFromCoordinatesInputs {
    /**
     * @displayName Inline Manager
     * @description The Inline Manager of the current instance of VertiGIS Inline.
     * @required
     */
    inlineManager: any;

    /**
     * @displayName Feature Set
     * @description The feature set that will be modified with m values.
     * @required
     */
    featureSet: FeatureSet;

    /**
     * @displayName Use Geometry
     * @description Whether to use the feature geometry or to use attributes that represent the coordinates.  
     * If false, requires x and y field names. Default is true.
     */
    useGeometry?: boolean;

    /**
     * @displayName X Value Field Name
     * @description The name of the field that represents the x value of the feature.
     */
    xFieldName?: string;

    /**
     * @displayName Y Value Field Name
     * @description The name of the field that represents the y value of the feature.
     */
    yFieldName?: string;

    /**
     * @displayName Spatial Reference
     * @description The spatial reference of the feature set. If not provided will use the one found
     * on the feature set. If none can be found on the feature set, will use the map's spatial reference.
     */
    spatialReference?: SpatialReference;

    /**
     * @displayName M Value Field Name
     * @description The name of the field the new m values will be assigned to.  Default
     * is "_M_VALUE_FIELD_".
     */
    mValueFieldName?: string;
}

/** An interface that defines the outputs of the activity. */
interface GetMValuesFromCoordinatesOutputs {
    /**
     * @description The feature set updated with M values.
     */
    featureSet: any;
}

/**
 * @displayName Get M Values From Coordinates
 * @category VertiGIS Inline
 * @description Generate M values for a line based on present x and y values.
 */
export default class GetMValuesFromCoordinatesActivity implements IActivityHandler {
    /** Perform the execution logic of the activity. */
    async execute(inputs: GetMValuesFromCoordinatesInputs, context: IActivityContext): Promise<GetMValuesFromCoordinatesOutputs> {
        let featureSet = inputs.featureSet;
        const spatialReference = inputs.spatialReference ?? featureSet.features[0].geometry.spatialReference ?? context.ambient.trivia!.map;
        const mFieldName = inputs.mValueFieldName ?? DEFAULT_M_VALUE_FIELD

        featureSet = await calculateMValuesFromCoordinates(
            inputs.inlineManager,
            featureSet,
            inputs.useGeometry ?? false,
            inputs.xFieldName ?? "",
            inputs.yFieldName ?? "",
            spatialReference,
            mFieldName
        )

        return {
            featureSet
        };
    }
}
