<template>
    <v-alert type="error" v-show="value.display">
        {{value.text}}
    </v-alert>
</template>

<script>
    export default {
        name: "error-alert",
        props: {
            value: {
                display: Boolean,
                text: String,
            }
        },
        data: () => ({}),
        watch: {
            value() {
                this.$emit('input', this.value);
            }
        }
    }
</script>
