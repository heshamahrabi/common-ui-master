<template>
    <div>
        <!-- container for tiling -->
        <v-container fluid>
            <v-row>
                <v-col>
                    <!-- actual entity details -->
                    <v-card max-width="1000px">
                        <v-data-table :headers="headers" :items="fields" :loading="isContentLoading">
                            <template v-slot:item.title="{item}">
                                <v-label text small>
                                    {{item.descriptor.doc?item.descriptor.doc.value:item.key}}
                                </v-label>
                            </template>
                            <template v-slot:item.value="{item}">
                                <!-- Primitive field -->
                                <!-- These are edited directly -->
                                <v-text-field v-if="!item.enum && !item.descriptor.rt" :disabled="!item['enabled']"
                                              :ref="'edit.'+item.key"
                                              v-model="item['value']"></v-text-field>
                                <!-- Enum field -->
                                <!-- These are edited directly using a dropdown menu -->
                                <v-select v-if="item.enum" :disabled="!item['enabled']" :ref="'edit.'+item.key"
                                          v-model="item['value']" :items="item.enum"></v-select>
                                <!-- Association field -->
                                <!-- These are edited via a selection list dialog which is opened on click -->
                                <v-text-field v-if="item.descriptor.rt" :disabled="!item['enabled']"
                                              :ref="'edit.'+item.key"
                                              v-model="item['text']"
                                              @click="fieldClicked(item.descriptor)"></v-text-field>
                            </template>
                            <!--template v-slot:item.type="{item}">
                                <v-label text small>
                                    {{sdrResourceUtils.getFieldTypeFromSchemaJson(jsonSchema,item.key)}}
                                </v-label>
                            </template-->
                            <template v-slot:item.actions="{ item }">
                                <!-- We'll show actions only for non-collections (primitives and simple associations) -->
                                <div v-if="!item.report || !item.report.isCollection">
                                    <v-icon @click="toggleEditable(item)">mdi-pencil</v-icon>
                                    <v-icon @click="persist(item)">mdi-content-save</v-icon>
                                    <slot name="fieldAction" v-bind:item="item"></slot>
                                </div>
                            </template>
                        </v-data-table>
                        <slot name="footer" v-bind:item="{resource}"></slot>
                        <!-- TODO: Inline entities with a sub-grid-->
                    </v-card>
                </v-col>
                <!-- Additional context - linked entity details or similar -->
            </v-row>
        </v-container>
        <!-- List selection dialog. Used to select a resource from a collection,
        e.g. to form an association between two resources. -->
        <ListSelectionDialog v-model="showListSelectionDialog"
                             :descriptor="listSelectionDialogDescriptor"
                             @clickedResource="associationSelected($event)"
                             @canceled="showListSelectionDialog=false"
        />
    </div>
</template>

<script>
    import alpsMetadataUtils from "../scripts/AlpsMetadataUtils";
    import sdrResourceUtils from '../scripts/SdrResourceUtils'
    import ListSelectionDialog from "./ListSelectionDialog";

    export default {
        name: "EntityDetails",
        components: {ListSelectionDialog},
        props: {
            titleText: String,
            server: null,
            resourceName: null,
            uri: null
        },
        data: () => ({
            query: {},
            params: {
                server: null,
                resourceName: null,
                uri: null
            },
            isContentLoading: false,
            /** JSON metadata concerning the entity whose details are shown */
            jsonSchema: null,
            /** ALPS metadata concerning the entity whose details are shown */
            alpsSchema: null,
            /** Ketting resource (~URL) pointing to the entity whose details are shown */
            resource: {},
            /** actual entity object (JSON), result of retrieving (get/fetch) the resource */
            entity: null,
            headers: [
                {text: "Feld", value: "title"},
                {text: "Wert", value: "value"},
                //{text: "Typ", value: "type"},
                {text: "Aktionen", value: "actions", sortable: false}
            ],
            fields: [],
            // we need to make this available in data so the template can reference it
            sdrResourceUtils: sdrResourceUtils,

            // ### List selection dialog ###
            showListSelectionDialog: false,
            listSelectionDialogDescriptor: "",
        }),
        methods: {
            fieldClicked(descriptor) {
                if (descriptor['type'] === "SAFE" && descriptor['rt']) {
                    // this appears to be an association. Using ListSelection is advised.
                    this.editAssociation(descriptor)
                }
            },
            editAssociation(descriptor) {
                console.log("clicked descriptor", descriptor)
                this.listSelectionDialogDescriptor = descriptor;
                this.showListSelectionDialog = true;
            },
            /**
             * Fired when an association was selected via the selection list, this method also tries to obtain an
             * inline representation of the associated resource.
             * */
            async associationSelected(uri) {
                console.log("An association was selected:", uri);
                let editedAssociationName = this.listSelectionDialogDescriptor['name'];

                // +++ The following just fetches an inline representation for the associated resource. This could be done more elegantly and centrally.
                let associatedAlpsProfile = await sdrResourceUtils.resourceFromUri(this.listSelectionDialogDescriptor['rt']).get();
                // the following attempts to obtain an inline representation string for the selected resource
                let inlineProjectionName = alpsMetadataUtils.getInlineProjectionName(associatedAlpsProfile);
                // the field text defaults to an empty string - URIs are confusing
                let associationText = "";
                if (inlineProjectionName) {
                    let inlineProjection = await sdrResourceUtils.resourceFromUri(uri + "?projection=" + inlineProjectionName).get();
                    // +++ there's a fn for this - but even thats not optimal. consider improving.
                    let projectionFieldKeys = Object.keys(inlineProjection);
                    if (projectionFieldKeys.length > 0) associationText = inlineProjection[projectionFieldKeys[0]]
                    // +++
                }
                // +++

                this.fields = this.fields.map(field => {
                    if (field.key === editedAssociationName) {
                        field.value = uri;
                        field.text = associationText;
                    }
                    return field;
                });
                console.log(this.fields)

                this.showListSelectionDialog = false;
            },
            /**
             * Obtains the fields that populate the table.
             * @param entity
             * @returns {*[]}
             */
            async constructFields(entity) {
                let fields = [];
                let fieldDescriptors = alpsMetadataUtils.getAlpsFieldDescriptors(this.alpsSchema);
                for (const key of Object.keys(this.jsonSchema.properties)) {
                    let descriptor = fieldDescriptors.find(descriptor => {
                        return descriptor.name === key
                    });
                    let text = entity[key];
                    let report = null;
                    if (descriptor['rt']) {
                        report = await alpsMetadataUtils.scoutAssociatedResource(descriptor, this.resource);
                        if (report.inline) text = report.inline
                    }
                    fields.push({
                        key: key,
                        value: entity[key],
                        text: text,
                        enabled: false,
                        descriptor: descriptor,
                        report: report
                    })
                }
                console.log(fields)
                return fields;
            },
            fetchQuery() {
                this.query = this.$route.query;
            },
            // The following methods are going to be used when EntityDetails has been made usable as a normal element component (rather than a routable one)
            // emit event to notify the parent resource when the entity is persisted
            //saved(){
            //    this.$emit('saved',this.resource.url);
            //},
            // emit event to notify the parent resource when this details view is closed
            //canceled(){
            //    this.$emit('canceled',this.resource.url);
            //},
            toggleEditable(item) {
                this.fields = this.fields.map(field => {
                    if (field.key === item.key) {
                        field['enabled'] = !field['enabled'];
                    }
                    return field;
                })
            },
            async persist(item) {
                console.log("persisting item", item)
                this.entity[item.key] = item.value;
                let patch = {}
                patch[item.key] = item.value;
                // we need to follow self first, since the resource is likely a relative link (e.g.: [someone]/address)
                let selfResource = await this.resource.follow('self');
                await selfResource.patch(patch);
                // reload this component so it can reflect the changes
                this.load();
            },
            async load() {
                this.fetchQuery();
                let queryParams = this.$route.query;
                Object.keys(this.params).forEach(key => {
                    console.log("key", key)
                    if (this[key]) {
                        console.log("this[key]", this[key])
                        this.params[key] = this[key]
                    } else if (queryParams[key]) {
                        console.log("queryParams[key]", queryParams[key])
                        this.params[key] = queryParams[key]
                    }
                });

                // ### Ketting Mixin ###
                let ketting = sdrResourceUtils.kettingFromServer(this.params.server)
                this.alpsSchema = await sdrResourceUtils.fetchAlpsSchema(this.params.resourceName, ketting);
                this.jsonSchema = await sdrResourceUtils.fetchJsonSchema(this.params.resourceName, ketting);
                this.resource = await sdrResourceUtils.resourceFromUri(this.params.uri);
                this.entity = await this.resource.get();
                this.fields = await this.constructFields(this.entity);
                // Now allow table to render
                this.isContentLoading = false;
            }
        },
        created() {
            this.load();
        }
    }
</script>

<style scoped>

</style>
