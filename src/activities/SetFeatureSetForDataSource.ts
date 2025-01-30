import type { IActivityHandler } from "@vertigis/workflow";
import { IActivityContext } from "@vertigis/workflow/IActivityHandler";

interface SetFeatureSetForDataSourceInputs {
    /**
     * The FeatureSet that will be used by the data source.
     *
     * @displayName FeatureSet
     * @description The FeatureSet that will be used by the data source.
     * @required
     */
    featureSet: __esri.FeatureSet;
}

/**
 * Designate a FeatureSet to be used in an Inline data source.
 * 
 * @displayName Set FeatureSet For Data Source
 * @category VertiGIS Inline
 * @description Designate a FeatureSet to be used in an Inline data source.
 */
export default class SetFeatureSetForDataSourceActivity
    implements IActivityHandler
{
    execute(
        inputs: SetFeatureSetForDataSourceInputs,
        context: IActivityContext,
    ) {
        context.ambient.outputs["featureSet"] = inputs.featureSet;
        return {};
    }
}
