
export default {
    props: {
        reloadComponent: {type: Boolean},
        componentId: {type: String},
    },

    created() {
        this.initData();
    },

    computed: {
      reloadAllComponentsEventName() {
          return 'reloadAllComponents';
      },
      componentReloadFinishedEventName() {
          return 'componentReloadFinished';
      }
    },

    methods: {
        initData(){

        },
        sendReloadAllComponentsEvent() {
            this.$emit(this.reloadAllComponentsEventName, this.componentId);
        },
        sendComponentReloadFinishedEvent() {
            this.$emit(this.componentReloadFinishedEventName, this.componentId);
        },
        sendComponentReloadFinishedEventWhenAllElementsInProcessStatusAreTrue(processStatus) {
            let send = true;
            Object.values(processStatus).forEach((processIsFinished) => {
                    send = send && processIsFinished;
                }
            )
            if (send) {
                this.sendComponentReloadFinishedEvent();
            }
        }
    },

    watch: {
        reloadComponent(val) {
            if (val) {
                this.initData();
            }
        },
    },
}
