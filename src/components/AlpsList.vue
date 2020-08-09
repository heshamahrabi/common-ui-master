<template>
    <div class="AlpsList">
        <v-layout column wrap>
            <!-- Data Table section -->
            <v-flex>
                <v-card v-model="isContentLoading">
                    <!-- Table -->
                    <v-data-table
                            v-model="selectedEntries"
                            :headers="headers"
                            :items="items"
                            item-key="_links.self.href"
                            :items-per-page="pagination.itemsPerPage"
                            :loading="isContentLoading"
                            loading-text="loading, please wait.."
                            no-results-text="could not find any values matching the filter"
                            :search="searchString"
                            :show-select="showSelect"
                            :server-items-length="totalItems"
                            :options.sync="pagination"
                    >
                        <template
                                v-slot:item="{ headers, item, index, isSelected, select /*expand, isExpanded*/}">
                            <tr @click="clickedResource(itemResource(index))">
                                <td v-for="header in headers" :key="header.name">
                                    <!-- Any normal field -->
                                    <v-label v-if="item[header.name]&&header.value!=='href'">{{item[header.name]}}
                                    </v-label>
                                    <!-- An association -->
                                    <v-label text small rounded v-if="header.value==='href'"
                                             @click="routeToAssociatedMenu(itemResource(index),header.name, header['rt'])">
                                        {{item[header.name]?item[header.name]:'...'}}
                                    </v-label>
                                    <!-- The in-place editing and creation function has been commented out for now as it seems to only confuse the users! -->
                                    <!-- Shortcut to an edit dialog for creating a new associated resource
                                    Note that this icon will only be shown if there are no resources associated yet -->
                                    <!--v-btn small text icon
                                            v-if="header.value==='href' && !item[header.name]"
                                           @click="newAssociatedResource(alpsMetadataUtils.getRepresentationDescriptor(alpsSchema).href,itemResource(index).uri,header['rt'], header.name)">
                                        <v-icon>mdi-pencil</v-icon>
                                    </v-btn-->

                                    <!-- The select box in the first column -->
                                    <v-checkbox
                                            v-if="header.value === 'data-table-select'"
                                            @input="select($event)"
                                            :value="isSelected"
                                    ></v-checkbox>
                                    <!-- The action icons in the last column -->
                                    <div v-if="header.value === 'data-table-actions'">
                                        <v-icon class="mr-2"
                                                @click="newOrUpdate(params.server, params.resource, itemResource(index).uri)">
                                            mdi-pencil
                                        </v-icon>
                                        <v-icon class="mr-2"
                                                @click="urlOfResourceSlatedForDeletion=itemResource(index).uri">
                                            mdi-delete
                                        </v-icon>
                                        <v-btn small text icon
                                               :to="{ name: 'Details', query: { server: params.server, resourceName: params.resource,uri: itemResource(index).uri}}">
                                            <v-icon>mdi-file-document-outline</v-icon>
                                        </v-btn>
                                        <!-- The slot for custom actions injected from the parent -->
                                        <slot name="action" v-bind:resource="itemResource(index).uri"></slot>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <!-- Table title bar -->
                        <template v-slot:top>
                            <v-card-title>
                                {{params.listTitle}}
                            </v-card-title>
                            <!-- "New" Dialog trigger -->
                            <v-tooltip bottom>
                                <template v-slot:activator="{ on }">
                                    <v-icon class="ml-5" v-on="on" @click="newOrUpdate(params.server, params.resource)">
                                        mdi-plus-circle-outline
                                    </v-icon>
                                </template>
                                <span>Neu anlegen</span>
                            </v-tooltip>
                            <!-- Filter dialog -->
                            <v-dialog v-model="showFilterDialog" max-width="600px">
                                <template v-slot:activator="{ on }">
                                    <v-btn text small icon v-on="on">
                                        <v-icon>mdi-magnify</v-icon>
                                    </v-btn>
                                </template>
                                <v-card>
                                    <v-card-text>
                                        <v-form ref="filterForm">
                                            <div v-if="jsonSchema && jsonSchema.properties">
                                                <v-text-field v-model="searchString" placeholder="Search" clearable
                                                              counter="30"/>
                                                <div v-for="filter in filters" :key="filter.name">
                                                    <v-text-field
                                                            v-if="jsonSchema.properties[filter.name] && !jsonSchema.properties[filter.name].enum"
                                                            v-model="filter.filterString"
                                                            :label="filter.name"
                                                            counter="30"/>
                                                    <v-select
                                                            v-model="filter.filterString"
                                                            v-if="jsonSchema.properties[filter.name] && jsonSchema.properties[filter.name].enum"
                                                            :items="jsonSchema.properties[filter.name].enum"
                                                            :label="filter.name"
                                                    ></v-select>
                                                </div>
                                            </div>
                                        </v-form>
                                    </v-card-text>
                                    <v-card-actions>
                                        <v-spacer/>
                                        <v-btn text @click="closeFilterDialog">Cancel</v-btn>
                                        <v-btn color="green" text @click="loadCollection">Save</v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-dialog>
                        </template>
                    </v-data-table>
                </v-card>
            </v-flex>
            <!-- Edit/New Dialog -->
            <EditDialog v-model="showEditDialog"
                        :server="editDialogServer"
                        :resource-name="editDialogCollectionName"
                        :entity-resource-url="urlOfResourceToBeEdited"
                        :creation-origin-profile-uri="editDialogCreationOriginProfileUri"
                        :creation-origin-resource-uri="editDialogCreationOriginResourceUri"
                        :creation-origin-rel="editDialogCreationOriginRel"
                        @done="loadCollection"
                        @canceled="showEditDialog=false"
            />
            <!-- Deletion dialog. Shown only while it has a url that isn't null.
             @deleted causes a reload of the table if an item was deleted
             @canceled nulls the slated item to be if the dialog was canceled. -->
            <DeleteDialog v-model="urlOfResourceSlatedForDeletion"
                          @deleted="loadCollection"
                          @canceled="urlOfResourceSlatedForDeletion=null"
            />
        </v-layout>
    </div>
</template>

<script>
    import alpsMetadataUtils from '../scripts/AlpsMetadataUtils'
    import DeleteDialog from "./DeleteDialog";
    import EditDialog from "./EditDialog";
    import sdrResourceUtils from '../scripts/SdrResourceUtils'

    export default {
        name: 'alps-list',

        props: {
            listTitle: String,
            server: String,
            resource: String,
            filters: {type: Array, default: () => []},
            headerIgnoreList: {type: Array, default: () => []},
            collectionResourceUri: String
        },

        components: {DeleteDialog, EditDialog},

        data: () => ({
            // for use in the template above
            alpsMetadataUtils: alpsMetadataUtils,
            params: {
                listTitle: null,
                server: null,
                resource: null,
                filters: [],
            },
            jsonSchema: null,
            alpsSchema: null,
            isContentLoading: false,
            defaultItem: {},

            showTable: true,

            // ### Search & Filter ###
            showFilterDialog: false,
            searchString: "",

            // ### Ketting client ###
            ketting: null,

            // ### Select via checkboxes ###
            showSelect: true,
            singleSelect: false,
            selectedEntries: [],

            // ### Items ###
            // full HAL response of the server
            collectionResource: null,
            // extracted body of the collection (without HAL elements)
            // often not more than paging information
            collection: null,
            // HAL responses to all collection links ("self" links in the collectionResource's array)
            itemResources: [],
            // array of the extracted bodies of itemResources (without HAL elements)
            items: [],
            // total number of items - needed by the data table
            totalItems: 0,

            // ### Headers ###
            headers: [],
            alpsFieldDescriptors: [],

            // ### Enum support ###
            enums: new Map(),

            // ### Pagination ###
            // pagination should never be updated by us directly, only by the table!
            pagination: {
                page: 1,
                itemsPerPage: 5,
                // the following are default
                //pageStart: number
                //pageStop: number
                //pageCount: number
                //itemsLength: number
            },

            // validation rules
            rules: {
                required: value => !!value || 'Required.',
            },

            // ### Delete ###
            urlOfResourceSlatedForDeletion: null,

            // ### Edit ###
            showEditDialog: false,
            editDialogServer: null,
            editDialogCollectionName: null,
            editDialogCreationOriginProfileUri: null,
            editDialogCreationOriginResourceUri: null,
            editDialogCreationOriginRel: null,
            urlOfResourceToBeEdited: null,
        }),

        computed: {
            // Translates the vuetify table pagination to the HAL format expected by the Spring backend
            springPaginationParams: function () {
                let paginationParams = {
                    "page": this.pagination.page - 1,
                    "size": this.pagination.itemsPerPage
                };
                if (this.pagination.sortBy && this.pagination.sortBy[0]) {
                    paginationParams["sort"] = this.pagination.sortBy[0] + "," + (this.pagination.sortDesc[0] ? "desc" : "asc")
                }
                return paginationParams
            },
            springFilterParams: function () {
                let springFilterParams = this.springPaginationParams;
                this.params.filters.forEach(function (filter) {
                    springFilterParams[filter.name] = filter.filterString
                });
                return springFilterParams
            }
        },

        methods: {
            itemResource: function (index) {
                console.log("fetching itemResource at index",index);
                return this.itemResources[index];
            },
            async getRouteToAssociatedMenu(originResource, rel, targetProfileUri) {
                let targetAlpsProfileResource = sdrResourceUtils.resourceFromUri(targetProfileUri);
                let targetAlpsProfile = await targetAlpsProfileResource.get();
                let targetResourceDoc = alpsMetadataUtils.getRepresentationDescriptor(targetAlpsProfile)['doc'];
                let title = targetResourceDoc ? targetResourceDoc : rel;
                let server = sdrResourceUtils.getServerFromProfileUrl(targetProfileUri);
                let resourceName = sdrResourceUtils.getResourceNameFromProfileUrl(targetAlpsProfileResource.uri);
                console.log("originResource", originResource)
                console.log("rel", rel)
                let targetResource = await originResource.follow(rel, {});
                let entity = await targetResource.get();
                // the heuristic for identifying whether a resource is a collection is the combination of the following:
                // - its entity does not contain any fields
                // - it contains an '_embedded' array
                let isCollection = (Object.keys(entity).length === 0 && targetResource.repr.body['_embedded']);
                // TODO: deal with there not (yet) being an entity and other errors!
                if (isCollection) {
                    return {
                        name: "List",
                        params: {
                            listTitle: "Liste",
                            server: server,
                            resource: resourceName,
                            collectionResourceUri: targetResource.uri
                        }
                    }
                } else {
                    return {
                        path: "details",
                        query: {titleText: title, server: server, resourceName: resourceName, uri: targetResource.uri}
                    }
                }
            },
            routeToAssociatedMenu(originResource, targetRel, targetProfileUri) {
                this.getRouteToAssociatedMenu(originResource, targetRel, targetProfileUri).then(route => {
                    console.log("route", route)
                    this.$router.push(route);
                })
            },

            /**
             * Creates table headers and their filters dynamically
             */
            createTableHeaders(alpsFieldDescriptors) {
                this.headers = [];
                let that = this;

                alpsFieldDescriptors.forEach(descriptor => {
                    // add a filterString for each header; the variable has to exist
                    let filter = that.params.filters.find(filter => {
                        return filter.name === descriptor.name;
                    });
                    // if this filter already existed, return.
                    if (!filter) {
                        filter = {"name": descriptor.name, "filterString": ""};
                        that.params.filters.push(filter);
                    }
                    let is_href = (descriptor.type === "SAFE");
                    that.headers.push({
                        // the displayed text should be the doc string if there is one, else we'll take the name of the descriptor
                        // note that enums are an exception - their doc string contains all values (unfortunately)
                        text: descriptor["doc"] ? descriptor["doc"]["value"] : descriptor["name"],
                        name: descriptor["name"],
                        value: is_href ? "href" : descriptor["name"],
                        rt: (is_href ? descriptor["rt"] : ""),
                        filter: value => {
                            if (!filter.filterString) return true;
                            return value.includes(filter.filterString)
                        }
                    });
                });
                // actions (akin to the data-table-select added by vuetify if show-select is true)
                this.headers.push({
                        text: "Aktionen",
                        value: "data-table-actions",
                        rt: "",
                        filter: false
                    }
                );

                this.deleteIgnorableHeaders();
            },

            /**
             * Deletes all headers that should not be rendered
             */
            deleteIgnorableHeaders() {
                this.headers = this.headers.filter(function (header) {
                    return !this.headerIgnoreList.includes(header.value)
                }.bind(this));
            },

            /** Opens the EditDialog. If a url was provided, offers to edit the resource. If not, offers to create a new resource. */
            newOrUpdate(server, collectionName, url) {
                this.editDialogCreationOriginRel = null;
                this.editDialogCreationOriginResourceUri = null;
                this.editDialogCreationOriginProfileUri = null;
                this.editDialogServer = server;
                this.editDialogCollectionName = collectionName;
                if (url) this.urlOfResourceToBeEdited = url;
                this.showEditDialog = true;
            },

            /**
             * Configures the edit dialog to offer creating a new associated resource.
             * Back links (from the new resource to this origin) are pre-filled.
             * Optionally, the edit dialog can also be furnished with a rel to patch in this resource
             * once the new resource has been created.
             * */
            async newAssociatedResource(originProfileUri, originResourceUri, targetProfileUri, rel) {
                console.assert(originProfileUri, "originResourceProfileUri must not be null!");
                console.assert(originResourceUri, "originResourceUri must not be null!");
                console.assert(targetProfileUri, "targetProfileUri must not be null!");
                this.urlOfResourceToBeEdited = null;
                this.editDialogCollectionName = sdrResourceUtils.getResourceNameFromProfileUrl(targetProfileUri);
                //let targetAlpsProfileResource = sdrResourceUtils.resourceFromUri(targetProfileUri);
                //let targetAlpsProfile = await targetAlpsProfileResource.get();
                this.editDialogServer = sdrResourceUtils.getServerFromProfileUrl(targetProfileUri);
                this.editDialogCreationOriginProfileUri = originProfileUri;
                this.editDialogCreationOriginResourceUri = originResourceUri;
                // We'll also include the rel which would need to be patched to the new association
                // - if it isn't readOnly, that is.
                if (this.jsonSchema.properties[rel] !== 'readOnly') {
                    this.editDialogCreationOriginRel = rel;
                }
                this.showEditDialog = true;
            },

            /**
             * Returns a filterable collection resource if possible or defaults to the initial collection
             */
            async getFilteredResourceOrDefault(collectionResource, filterArgs) {
                if (!await collectionResource.hasLink("search")) return collectionResource;
                let searchResource = await collectionResource.follow("search");
                if (!await searchResource.hasLink("filter")) return collectionResource;
                return searchResource.follow("filter", filterArgs);
            },

            /**
             * Reloads the collectionResource based on all available parameters such as pagination, sorting and filtering
             */
            async loadCollection() {
                console.log("loadCollection")
                this.isContentLoading = true;
                // since we may not be showing it any more, make sure that no resource is slated for deletion
                // note that this also turns off the deletion dialog!
                this.urlOfResourceSlatedForDeletion = null;
                this.showEditDialog = false;
                this.showFilterDialog = false;
                // we may need to load a specific collection, such as the addresses of a specific legal entity
                if (this.collectionResourceUri) {
                    this.collectionResource = await sdrResourceUtils.resourceFromUri(this.collectionResourceUri);
                } else {
                    // this is the base collection resource
                    let collectionResource = await this.ketting.go().follow(this.params.resource, this.springPaginationParams);
                    // this is the filtered collection resource if filtering is possible, otherwise the base collection resource
                    let targetResource = await this.getFilteredResourceOrDefault(collectionResource, this.springFilterParams);
                    // The collection may have changed. Let's invalidate Ketting's cache first.
                    await targetResource.refresh();
                    this.collectionResource = targetResource;
                }
                await this.loadItems();
            },

            /**
             * Repopulates the list with items from the collectionResource
             */
            async loadItems() {
                this.itemResources = await this.collectionResource.followAll(this.params.resource);
                console.log("this.itemResources",this.itemResources);
                console.log("setting items to 0")
                let items = [];
                this.items = [];
                // now we get the actual items from their resources.
                for (const itemResource of this.itemResources) {
                    console.log("looping")
                    let item = await itemResource.get();
                    // Adding inline projections to replace associated entity hyperlinks wherever possible
                    for (const header of this.headers) {
                        let hasLink = await itemResource.hasLink(header.name);
                        if (header['rt'] && hasLink) {
                            let descriptor = this.alpsFieldDescriptors.find(descriptor => descriptor.name === header.name);
                            let report = await alpsMetadataUtils.scoutAssociatedResource(descriptor, itemResource);
                            if (report.exists) item[header.name] = report.inline;
                        }
                    }
                    items.push(item)
                }
                this.items = items;


                // updating meta info on the page of the collection we're showing now
                let updatedCollection = await this.collectionResource.get();
                this.collection = updatedCollection;
                // How we obtain the total number of items depends on whether the collection is paginated
                if(updatedCollection.page)
                    this.totalItems = updatedCollection.page['totalElements'];
                else
                    this.totalItems = this.items.length
                this.isContentLoading = false;
            },


            /**
             * Removes the deleted item from the table
             */
            deleted(item) {
                const index = this.items.indexOf(item);
                this.items.splice(index, 1);
            },

            /**
             * Closes the Filter Dialog
             */
            closeFilterDialog() {
                this.showFilterDialog = false;
            },

            /**
             * Loads the AlpsList from scratch using props and query params as arguments
             */
            load() {
                let queryParams = this.$route.query;
                Object.keys(this.params).forEach(key => {
                    if (this[key]) this.params[key] = this[key];
                    else if (queryParams[key]) this.params[key] = queryParams[key]
                });

                // ### Ketting Mixin ###
                let ketting = sdrResourceUtils.kettingFromServer(this.params.server);
                this.ketting = ketting;
                // first grab all available metadata
                sdrResourceUtils.fetchJsonSchema(this.params.resource, ketting).then(schema => {
                    this.jsonSchema = schema;
                    sdrResourceUtils.fetchAlpsSchema(this.params.resource, ketting).then(schema => {
                        this.alpsSchema = schema;
                        // then build the table headers from metadata
                        this.alpsFieldDescriptors = alpsMetadataUtils.getAlpsFieldDescriptors(schema);
                        this.createTableHeaders(this.alpsFieldDescriptors);
                        // then grab the actual resource's HAL representation
                        ketting.go().follow(this.params.resource, {}).then(collectionResource => {
                            this.collectionResource = collectionResource;
                            this.isContentLoading = false;
                            // and cause it to update
                            this.loadCollection();
                        });
                    });
                });
            },
            clickedResource(resource) {
                this.$emit('clickedResource', resource.uri)
            }
        },
        created() {
            this.load()
        },

        watch: {
            pagination: {
                handler() {
                    // updating the list based on paging only makes sense when we have already fetched the resource
                    // and it's not already loading (which is the case in the beginning)
                    if (this.collectionResource && !this.isContentLoading) {
                        this.loadCollection();
                    }
                }
            },
            listTitle: function (newTitle) {
                this.params.listTitle = newTitle;
            },
            filterList: function (newFilters) {
                this.params.filters = newFilters;
                this.loadCollection()
            },
            // in the case of the server or collection resource changing, we need to completely reload the list
            server: function () {
                this.load()
            },
            resource: function () {
                this.load()
            },
        }
    };
</script>

<style>
    table {
        line-height: 15px;
    }

    table.v-table tbody tr td {
        font-size: 16px;
        height: 15px;
        padding: 0px;
    }
</style>
