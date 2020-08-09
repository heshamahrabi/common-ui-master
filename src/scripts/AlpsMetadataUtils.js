import sdrResourceUtils from './SdrResourceUtils'

export default {
    /**
     * Returns the field descriptors of the ALPS schema (used for things like populating table column headers)
     */
    getAlpsFieldDescriptors(alpsSchema) {
        console.assert(alpsSchema, "No ALPS Schema to parse! Maybe it wasn't fetched yet?");
        // find the top-level descriptor describing the fields
        let descriptor = alpsSchema["alps"].descriptor.find(descriptor => {
            return descriptor.id.includes("representation")
        });
        // return the descriptors contained therein
        return descriptor["descriptor"];
    },

    getRepresentationDescriptor(alpsSchema) {
        return alpsSchema["alps"]["descriptor"].find(descriptor => {
            return descriptor['id'].endsWith("representation")
        })
    },

    getFieldDescriptor(representationDescriptor, fieldName) {
        return representationDescriptor['descriptor'].find(descriptor => {
            return descriptor['name'] === fieldName
        });
    },

    getProjections(alpsSchema) {
        let getDescriptor = alpsSchema["alps"]["descriptor"].find(descriptor => {
            // TODO: let this find "get-address" (singular), which returns a single address rather than the "get-addresses" (plural) which returns the collection
            // at the moment, that isn't too critical since SDR uses the same projections for the collection as for the entity
            if (descriptor['id'].startsWith("get-")) return descriptor;
        });
        let projectionDescriptor = getDescriptor['descriptor'].find(descriptor => {
            if (descriptor['name'].startsWith("projection")) return descriptor;
        });
        if (projectionDescriptor)
            return projectionDescriptor['descriptor']
    },
    getProjectionNames(alpsSchema) {
        let projections = this.getProjections(alpsSchema);
        if (projections)
            return projections.map(descriptor => {
                return descriptor['name'];
            })
    },
    getInlineProjectionName(alpsSchema) {
        let projectionNames = this.getProjectionNames(alpsSchema);
        if (projectionNames) {
            return projectionNames.find(projectionName => {
                return projectionName.includes('inline')
            });
        }
        else return null
    },
    getFirstField(object) {
        let objectKeys = Object.keys(object);
        if (objectKeys.length > 0) return object[objectKeys[0]]
    },
    async getInlineRepresentationOfUri(profileUri, resourceUri) {
        let associatedAlpsProfile = await sdrResourceUtils.resourceFromUri(profileUri).get();
        let inlineProjectionName = this.getInlineProjectionName(associatedAlpsProfile);
        if(!inlineProjectionName)
            return {};
        let resource = await sdrResourceUtils.resourceFromUri(resourceUri + "?projection=" + inlineProjectionName);
        let inlineProjection = await resource.get().catch(() => {
            // if we get a 404, that's because this association doesn't exist (yet).
            return {};
        });
        return this.getFirstField(inlineProjection);
    },
    async scoutAssociatedResource(descriptor, originResource){
        let report = {rel: descriptor.name, exists: true, inline: null, isCollection: false}
        let associatedAlpsProfile = await sdrResourceUtils.resourceFromUri(descriptor['rt']).get();
        let inlineProjectionName = this.getInlineProjectionName(associatedAlpsProfile);
        let args = {};
        if(inlineProjectionName) args["projection"]=inlineProjectionName;
        let associatedResource = await originResource.follow(descriptor['name'], args);
        let entity = await associatedResource.get().catch(() => {
            // if we get a 404, that's because this association doesn't exist (yet).
            report.exists=false;
        });
        if(report.exists)
            report.inline= this.getFirstField(entity);
        if(entity) report.isCollection = !!(Object.keys(entity).length === 0 && associatedResource.repr.body['_embedded']);
        console.log("report",report)
        return report;
    },
    /**
     *
     * @param descriptor the descriptor of the associated resource (can be obtained from the origin resource's profile)
     * @param originResource the origin resource
     * @returns {Promise<undefined>}
     */
    async getInlineRepresentation(descriptor, originResource) {
        let associatedAlpsProfile = await sdrResourceUtils.resourceFromUri(descriptor['rt']).get();
        let inlineProjectionName = this.getInlineProjectionName(associatedAlpsProfile);
        let associatedResource = await originResource.follow(descriptor['name'], {projection: inlineProjectionName});
        let inlineProjection = await associatedResource.get().catch(() => {
            // if we get a 404, that's because this association doesn't exist (yet).
            return {};
        });
        return this.getFirstField(inlineProjection);
    },
    async getConstructorFieldDescriptors(alpsSchema) {
        let projections = this.getProjections(alpsSchema);
        if (projections) {
            let constructorProjection = projections.find(projection => {
                return projection['name'].includes('constructor-projection')
            });
            if (constructorProjection) {
                return constructorProjection['descriptor']
            }
        }
    },
};
