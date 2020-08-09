<template>
    <div class="deleteDialog">
        <v-dialog v-model="show" max-width="290">
            <v-card>
                <v-card-title class="headline">Delete Item?</v-card-title>
                <v-card-text>
                    Item will be deleted permanently and can't be recovered.
                </v-card-text>
                <v-card-actions>
                    <div class="flex-grow-1"></div>
                    <v-btn text @click="$emit('canceled',value)">
                        cancel
                    </v-btn>
                    <v-btn color="red" text @click="deleteResource()">
                        delete
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
    import sdrResourceUtils from '../scripts/SdrResourceUtils'

    export default {
        name: "DeleteDialog",
        // a.k.a. urlOfResourceSlatedForDeletion
        props: ['value'],
        //mixins: [sdrResourceContext],
        data: () => ({
            resource: null,
            show: false,
        }),
        methods: {
            loadResource() {
                if (this.value) {
                    this.resource = sdrResourceUtils.resourceFromUri(this.value);
                    this.show = true;
                } else {
                    this.show = false;
                }
            },
            deleteResource() {
                if (this.resource) {
                    this.resource.delete()
                        .then(() => {
                            console.log("deleted successfully")
                                this.$emit('deleted', null);
                            },
                            error => {
                                console.warn("onReject: error:", error)
                                // TODO: if(error==='HTTP error 409') display warning:
                                //  "Diese Entität kann nicht gelöscht werden, da noch andere Entitäten von ihr abhängen."
                            })
                } else {
                    console.assert("DeleteDialog did not have a resource to delete!")
                }
            }
        },
        watch: {
            value: function (val) {
                this.loadResource()
                this.show = !!val;
            },
            // this allows us to react to the dialog closing for any reason by emitting a "canceled" event.
            // note that this will also happen if the dialog is closed from the parent.
            show(val) {
                val || this.$emit('canceled');
            }
        }
    }
</script>

<style scoped>

</style>
