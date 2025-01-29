import type { IActivityHandler } from "@vertigis/workflow";
import { IActivityContext } from "@vertigis/workflow/IActivityHandler";

/** An interface that defines the inputs of the activity. */
interface SetFeatureSetForDataSourceInputs {

    /**
     * @displayName FeatureSet
     * @description The FeatureSet that will be used by the data source.
     * @required
     */
    featureSet: __esri.FeatureSet;
}

/**
 * @displayName Set FeatureSet For Data Source
 * @category VertiGIS Inline
 * @description Designate a FeatureSet to be used in an Inline data source.
 */
export default class SetFeatureSetForDataSourceActivity implements IActivityHandler {
    /** Perform the execution logic of the activity. */
    execute(inputs: SetFeatureSetForDataSourceInputs, context: IActivityContext) {
        context.ambient.outputs["featureSet"] = inputs.featureSet;
        return {};
    }
}
