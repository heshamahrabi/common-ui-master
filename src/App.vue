<template>
    <v-app>
        <!-- Simple nav drawer to get to different components -->
      <v-navigation-drawer app v-model="drawer" absolute temporary>
            <v-list nav dense>
<!--                <v-list-item v-for="route in $router.options.routes" :key="route.name" :to="route.path">
                    <v-list-item-title>{{route.name}}</v-list-item-title>
                </v-list-item>-->
                <v-list-item :to="{ name: 'List', query: { server: legalEntitiesServer, resource: 'debtors',listTitle: 'Debitoren'}}">
                    <v-list-item-title>Debitoren</v-list-item-title>
                </v-list-item>
                <v-list-item :to="{ name: 'List', query: { server: legalEntitiesServer, resource: 'globalDebtors',listTitle: 'DARs'}}">
                    <v-list-item-title>DARs</v-list-item-title>
                </v-list-item>
                <v-list-item :to="{ name: 'List', query: { server: legalEntitiesServer, resource: 'creditors',listTitle: 'Kreditoren'}}">
                    <v-list-item-title>Kreditoren</v-list-item-title>
                </v-list-item>
                <v-list-item :to="{ name: 'List', query: { server: legalEntitiesServer, resource: 'legalEntities',listTitle: 'Rechtspersonen'}}">
                    <v-list-item-title>Rechtspersonen</v-list-item-title>
                </v-list-item>
                <v-list-item :to="{ name: 'List', query: { server: legalEntitiesServer, resource: 'addresses',listTitle: 'Adressen'}}">
                    <v-list-item-title>Adressen</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
        <v-app-bar app color="primary" dark>
            <v-app-bar-nav-icon @click="drawer = true"></v-app-bar-nav-icon>
            <v-spacer></v-spacer>
            <div class="d-flex align-center">
                <v-img alt="Denkformat GmbH \& Co. KG Logo" src="./assets/logo.gif" height="48" width="160" contain
                       class="shrink mr-2"/>
            </div>
            <v-spacer></v-spacer>
            <v-btn href="https://www.intrafact.de" target="_blank" text>
                <span class="mr-2">intrafact.de</span>
                <v-icon>mdi-open-in-new</v-icon>
            </v-btn>
        </v-app-bar>
        <v-content>
            <!-- the key attribute is needed to make the router view update components completely when they receive new query params -->
            <router-view :key="$route.fullPath"></router-view>
        </v-content>
    </v-app>
</template>

<script>
    export default {
        name: 'App',

        components: {

        },

        data: () => ({
            drawer: false,
            legalEntitiesServer: 'http://localhost:8400/legal-entity',
           // legalEntitiesServer: "http://chaos.possessed.us:8400/legal-entity/",
        })
    };
</script>
