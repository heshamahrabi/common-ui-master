<!--
The EditDialog serves two purposes: Editing existing entities and creating new entites.
It distinguishes between the two by means of the entityResourceUrl prop - if that exists, it assumes it should edit
that existing resource rather than creating a new one.

It has the following props:
- value: A boolean indicating whether this dialog should be visible
- server: The host name incl. protocol and port
- resourceName: The name of the collection the entity belongs to
- entityResourceUrl: The URI of the existing resource to be edited
- creationOriginProfileUri: The URI of the creation context resource's profile
- creationOriginResourceUri: The URI of the creation context resource
- creationOriginRel: The rel of the creation context resource which the new resource is to associate with
-->
<template>
    <v-dialog v-model="show" v-if="entity" max-width="500px">
        <!--template v-slot:activator="{ on }">
            <v-btn color="primary" text small v-on="on">Create/Edit</v-btn>
        </template-->
        <v-card>
            <v-card-title>
                <span class="headline">Edit</span>
            </v-card-title>
            <v-card-text>
                <!-- The v-if is necessary to stop this from rendering before the properties we want to edit even exist -->
                <div v-if="!loading">
                    <v-form ref="form">
                        <div v-for="descriptor in fieldDescriptors"
                             :key="descriptor.name">
                            <!-- :rules="[rules.required,alpsFieldDescriptors[propertyName].ext?() => RegExp(alpsFieldDescriptors[propertyName].ext.value).test(editedItem[propertyName]):true]"-->
                            <!-- Field with primitive value -->
                            <v-text-field
                                    v-if="!jsonSchema.properties[descriptor.name].enum && !descriptor['rt']"
                                    v-model="editableEntity[descriptor.name]"
                                    :ref="'edit.'+descriptor.name"
                                    :label="descriptor.doc?descriptor.doc.value:descriptor.name"
                            />
                            <!-- Field with association (reference) -->
                            <!-- TODO: Anbieten von Anlegen von Ressourcen, die gebraucht werden aber diese Ressource nicht brauchen? -->
                            <v-text-field
                                    v-if="descriptor['rt']"
                                    :ref="'edit.'+descriptor.name"
                                    @click="fieldClicked(descriptor)"
                                    hint="Anklicken um aus Liste auszuwählen"
                                    persistent-hint
                                    :label="descriptor.doc?descriptor.doc.value:descriptor.name"
                                    v-model="inlinedAssociations[descriptor.name]"
                            >
                            </v-text-field>
                            <!-- Field with enum type -->
                            <v-select
                                    v-model="editableEntity[descriptor.name]"
                                    v-if="jsonSchema.properties[descriptor.name].enum"
                                    :items="jsonSchema.properties[descriptor.name].enum"
                                    :label="descriptor.doc?descriptor.doc.value:descriptor.name"
                            ></v-select>
                        </div>
                    </v-form>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn text @click="show=false">Cancel</v-btn>
                <v-btn color="green" text @click="updateResource">Save</v-btn>
            </v-card-actions>
        </v-card>
        <!-- List selection dialog. Used to select a resource from a collection,
        e.g. to form an association between two resources. -->
        <ListSelectionDialog v-model="showListSelectionDialog"
                             :descriptor="listSelectionDialogDescriptor"
                             @clickedResource="associationSelected($event)"
                             @canceled="showListSelectionDialog=false"
        />
    </v-dialog>
</template>

<script>
    import ListSelectionDialog from "./ListSelectionDialog";
    import alpsMetadataUtils from "../scripts/AlpsMetadataUtils";
    import sdrResourceUtils from "../scripts/SdrResourceUtils";

    export default {
        name: "EditDialog",
        components: {ListSelectionDialog},
        props: [
            // boolean indicating whether the dialog should be visible
            'value',
            // e.g.: "http://1.2.3.4:5678"
            'server',
            // e.g. "legalEntities"
            'resourceName',
            // If provided, this dialog will allow editing this resource
            // else, this dialog will instead create a new resource
            // e.g. "http://localhost:8400/legalEntities/1d450017-5b7d-464f-9f5c-f13128d6c7e6"
            'entityResourceUrl',
            // optional props to specify an association to be pre-filled into a 'new' dialog.
            // they make it possible to create a new associated resource from a specified resource context.
            'creationOriginProfileUri',
            'creationOriginResourceUri',
            'creationOriginRel'],
        data: () => ({
            /** JSON metadata concerning the entity whose details are shown */
            jsonSchema: null,
            /** ALPS metadata concerning the entity whose details are shown */
            alpsSchema: null,
            /** Ketting resource (~URL) pointing to the entity whose details are shown */
            entityResource: null,
            /** actual entity object (JSON), result of retrieving (get/fetch) the resource.*/
            entity: {},
            /** Entity excerpt consisting of all editable (not-readOnly) fields.
             * Note that if this is a "new" dialog, these will be taken from the constructor projection (if available)!
             */
            editableEntity: {},
            inlinedAssociations: {},
            fieldDescriptors: [],
            inlineRepresentations: new Map(),

            show: false,

            loading: true,

            // ### List selection dialog ###
            showListSelectionDialog: false,
            listSelectionDialogDescriptor: "",
        }),
        methods: {
            /** Tries to obtain an inline representation for an association, defaulting to the rel if it cannot find one.
             * */
            async getInlineString(descriptor, origin) {
                console.log("getInlineString")
                let inlineRep = await alpsMetadataUtils.getInlineRepresentation(descriptor, origin)
                console.log("inlineRep", inlineRep)
                if (inlineRep && inlineRep !== {})
                    return inlineRep;
                else return ""
            },
            /** Fetches the entity from the resource */
            async fetchEntity() {
                if (this.entityResourceUrl) {
                    this.entityResource = await sdrResourceUtils.resourceFromUri(this.entityResourceUrl);
                    this.entity = await this.entityResource.get().catch(() => {
                        return {};
                    })
                } else console.log("no entityResourceUrl provided.");
            },
            /**
             * Creates (POST) or updates (PUT) a resource
             */
            async updateResource() {
                if (this.entityResource) {
                    await this.entityResource.patch(this.editableEntity);
                } else {
                    // Since ketting expects a 'Location' header when POSTing which SDR does not provide,
                    // we'll use its fetch API instead. Yes, I know this ain't pretty.
                    const rawResponse = await this.collectionResource.fetch(this.collectionResource.uri, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(this.editableEntity)
                    });
                    const response = await rawResponse.json();
                    console.log("POST response", response)
                    console.log("this.creationOriginRel", this.creationOriginRel)
                    console.log("new resource uri", response['_links']['self']['href'])
                    // Since we did this POST manually, we'll need to let Ketting know that it should refresh the resource
                    // i.e.: clear its cache
                    await this.collectionResource.refresh();
                    // if we were provided with the rel of a creation origin to patch, we'll also do that.
                    if (this.creationOriginRel) {
                        console.log("patching creation origin, since this.creationOriginRel seems to be set:", this.creationOriginRel)
                        let patch = {}
                        patch[this.creationOriginRel] = response['_links']['self']['href'];
                        await sdrResourceUtils.resourceFromUri(this.creationOriginResourceUri).patch(patch);
                        console.log("patched creation origin!")
                    }
                }
                this.$emit('done', this.editableEntity);
            },
            fieldClicked(descriptor) {
                if (descriptor['type'] === "SAFE" && descriptor['rt']) {
                    // this appears to be an association. Using ListSelection is advised.
                    this.editAssociation(descriptor)
                }
            },
            editAssociation(descriptor) {
                console.log("clicked descriptor",descriptor)
                this.listSelectionDialogDescriptor = descriptor;
                this.showListSelectionDialog = true;
            },
            /**
             * Fired when an association was selected via the selection list, this method also tries to obtain an
             * inline representation of the associated resource.
             * */
            async associationSelected(uri) {
                console.log("An association was selected:",uri);
                let editedAssociationName = this.listSelectionDialogDescriptor['name'];
                this.editableEntity[editedAssociationName] = uri;
                let associatedAlpsProfile = await sdrResourceUtils.resourceFromUri(this.listSelectionDialogDescriptor['rt']).get();
                // the following attempts to obtain an inline representation string for the selected resource
                let inlineProjectionName = alpsMetadataUtils.getInlineProjectionName(associatedAlpsProfile);
                if (inlineProjectionName) {
                    let inlineProjection = await sdrResourceUtils.resourceFromUri(uri + "?projection=" + inlineProjectionName).get();
                    let projectionFieldKeys = Object.keys(inlineProjection);
                    if (projectionFieldKeys.length > 0) this.inlinedAssociations[editedAssociationName] = inlineProjection[projectionFieldKeys[0]]
                }
                this.showListSelectionDialog = false;
            },
            printProps() {
                console.log("### props ###")
                console.log('value',this.value)
                console.log('server',this.server);
                console.log('resourceName',this.resourceName);
                console.log('entityResourceUrl',this.entityResourceUrl);
                console.log('creationOriginProfileUri',this.creationOriginProfileUri);
                console.log('creationOriginResourceUri',this.creationOriginResourceUri);
                console.log('creationOriginRel',this.creationOriginRel);
                console.log("#############")
            },
            async load() {
                console.log("loading edit-dialog...")
                this.printProps();
                this.loading = true;
                console.assert(!!this.server, "prop 'server' expected but not provided!");
                console.assert(!!this.resourceName, "prop 'resourceName' expected but not provided!");
                let ketting = sdrResourceUtils.kettingFromServer(this.server)
                this.jsonSchema = await sdrResourceUtils.fetchJsonSchema(this.resourceName, ketting);
                this.alpsSchema = await sdrResourceUtils.fetchAlpsSchema(this.resourceName, ketting);
                // clearing the inlined associations and field descriptors
                this.inlinedAssociations = {};
                this.fieldDescriptors=[];

                // We'll need its collection because we may need to POST (not PUT)
                ketting.go().follow(this.resourceName, {}).then(resource => {
                    this.collectionResource = resource;
                });
                // Then we'll figure out which fields to offer.
                // If this is a new resource...
                if (!this.entityResourceUrl) {
                    let constructorProjectionDescriptors = await alpsMetadataUtils.getConstructorFieldDescriptors(this.alpsSchema)
                    // ...and if there is a constructor-projection, we'll gratefully use it
                    if (constructorProjectionDescriptors) {
                        console.log("using constructor projection to pick field descriptors")
                        this.fieldDescriptors = constructorProjectionDescriptors;
                    }
                } else {
                    // otherwise we'll fetch the entity. It will be used to pre-fill the fields.
                    await this.fetchEntity();
                }
                // if either this isn't a new entity or there was no constructor projection,
                // we'll use the non-readOnly fields of the entity to generate some fields.
                if (!this.fieldDescriptors || this.fieldDescriptors.length === 0) {
                    console.log("using non-readOnly fields to pick field descriptors")
                    this.fieldDescriptors = alpsMetadataUtils.getAlpsFieldDescriptors(this.alpsSchema).filter(descriptor => {
                        return this.jsonSchema.properties[descriptor.name]['readOnly'] !== true
                    });
                }
                // the actual object that is to be filled will also need to be prepared.
                // It will be generated from the descriptors and pre-filled where possible.
                let editableEntity = {};
                for (const descriptor of this.fieldDescriptors) {
                    let value = this.entity[descriptor.name];
                    if (value)
                        editableEntity[descriptor.name] = value;
                    else if (this.entityResource && await this.entityResource.hasLink(descriptor.name)) {
                        this.inlinedAssociations[descriptor.name] = await this.getInlineString(descriptor, this.entityResource)
                    }
                        // If there is an association with the same type (profile) as the creation origin,
                    // we'll pre-fill the field with the creation origin's resource uri
                    else if (descriptor['rt'] && descriptor['rt'].startsWith(this.creationOriginProfileUri)) {
                        // the actual entity to be POSTed contains the URI
                        editableEntity[descriptor.name] = this.creationOriginResourceUri;
                        // While the human-readable inline representation (if any) is shown
                        this.inlinedAssociations[descriptor.name] = await alpsMetadataUtils.getInlineRepresentationOfUri(this.creationOriginProfileUri, this.creationOriginResourceUri)
                    }
                }
                this.editableEntity = editableEntity;
                console.log("done loading.")
                console.log("jsonSchema", this.jsonSchema)
                console.log("field descriptors", this.fieldDescriptors)
                this.loading = false;
            },
        },

        watch: {
            value: function (val) {
                this.show = val;
                if (this.show) {
                    this.load();
                }
            },
            resourceUrl: function (newResourceUrl) {
                this.entityResourceUrl = newResourceUrl;
            },
            // this allows us to react to the dialog closing for any reason by emitting a "canceled" event.
            // note that this will also happen if the dialog is closed from the parent - make sure to avoid loops.
            show(val) {
                val || this.$emit('canceled');
            }
        },
        created() {
            if (this.value)
                this.load();
        }
    }
</script>

<style scoped>

</style>
