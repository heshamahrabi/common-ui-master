import sdrResourceUtils from '../scripts/SdrResourceUtils'

export default {
    props: {
        server: String,
        resourceCollectionName: String
    },
    data: () => ({
        resourceContext: null,
        jsonSchema: null,
        alpsSchema: null
    }),
    computed: {
        resourceContext() {
            console.assert(this.resourceCollectionName, "SdrResourceContext was not given a collection name!")
            if (!this.resourceContext) {
                let ketting = sdrResourceUtils.kettingFromServer(this.server);
                ketting.go().follow(this.resourceCollectionName, {}).then(collectionResource => {
                    this.resourceContext = collectionResource;
                });
            }
            return this.resourceContext;
        },
        jsonSchema() {
            console.assert(this.resourceContext, "SdrResourceContext was not given a resource context!");
            if (!this.jsonSchema) sdrResourceUtils.fetchJsonSchema(this.resourceContext).then(r => {
                this.jsonSchema = r;
                return r;
            });
            else return this.jsonSchema;
        },
        alpsSchema() {
            console.assert(this.resourceContext, "SdrResourceContext was not given a resource context!");
            if (!this.alpsSchema) sdrResourceUtils.fetchAlpsSchema(this.resourceContext).then(r => {
                this.alpsSchema = r;
                return r;
            });
            else return this.alpsSchema;
        }
    },
    methods: {
        retrieveJsonSchema() {

        },
        retrieveAlpsSchema() {

        }
    }
}