<template>
    <v-snackbar
            color="red"
            v-model="value.display"
            multi-line
            right
            bottom
    >
        {{value.text}}
        <v-btn
                text
                @click="value.display = false"
        >
            Close
        </v-btn>
    </v-snackbar>
</template>

<script>
    export default {
        name: "error-snackbar",
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
