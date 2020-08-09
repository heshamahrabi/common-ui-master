
export default {

    methods: {
        reloadAllComponents(){
            Object.entries(this.reloadableComponents).forEach(([componentName, value]) => {
                this.reloadableComponents[componentName] = true;
                }
            )
        },

        componentReloadFinished(componentName){
            this.reloadableComponents[componentName] = false;
        }
    }

}
