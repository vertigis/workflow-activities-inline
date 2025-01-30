import type { IActivityHandler } from "@vertigis/workflow";
import { IActivityContext } from "@vertigis/workflow/IActivityHandler";

interface SetFeatureSetForDataSourceInputs {
    /**
     * The Feature Set that will be used by the data source.
     *
     * @displayName Feature Set
     * @description The Feature Set that will be used by the data source.
     * @required
     */
    featureSet: __esri.FeatureSet;
}

/**
 * Designate a Feature Set to be used in an Inline data source.
 * 
 * @displayName Set Feature Set For Data Source
 * @category VertiGIS Inline
 * @description Designate a Feature Set to be used in an Inline data source.
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
