<template>
    <div class="listSelectionDialog">
        <v-dialog v-model="show" max-width="1200px">
            <alps-list :list-title="listTitle" :server="server" :resource="resourceName" :header-ignore-list=headerIgnoreList :filters=filters @clickedResource="$emit('clickedResource',$event)"/>
        </v-dialog>
    </div>
</template>

<script>
    import sdrResourceUtils from "../scripts/SdrResourceUtils";
    import alpsMetadataUtils from "../scripts/AlpsMetadataUtils";

    export default {
        name: "ListSelectionDialog",
        props: [
            // boolean indicating whether the dialog should be visible
            'value',
            // ALPS-Descriptor
            'descriptor',
        ],
        data: () => ({
            show: false,
            headerIgnoreList: ['data-table-actions'],
            // e.g.: "http://1.2.3.4:5678"
            server: "",
            // e.g. "legalEntities"
            resourceName: "",
            propertyName: "",
            filters: [],
            listTitle: "Auswahl"
        }),
        methods: {
            async load(descriptor) {
                let profile = await sdrResourceUtils.resourceFromUri(descriptor['rt']).get();
                let representationDescriptor = alpsMetadataUtils.getRepresentationDescriptor(profile);
                let associatedResourceCollectionName = sdrResourceUtils.getResourceNameFromProfileUrl(descriptor['rt']);
                this.server = sdrResourceUtils.getServerFromProfileUrl(descriptor['rt']);
                this.resourceName = associatedResourceCollectionName;
                this.propertyName = descriptor['name'];
                //this.listSelectionDialogResourceDescriptor = descriptor;
                // TODO: Filter?
                //this.listSelectionDialogFilters= ;
                this.listTitle = "Auswahl: " + representationDescriptor['doc']['value'];
            },
        },
        watch: {
            value: function (val) {
                this.show = val;
            },
            show: function(val){
                if(this.value !== val){
                    this.$emit('canceled', null)
                }
                // if the dialog should be visible and we have been given a descriptor, load this list
                if(val&&this.descriptor)
                    this.load(this.descriptor)
            }
        },
    }
</script>

<style scoped>

</style>