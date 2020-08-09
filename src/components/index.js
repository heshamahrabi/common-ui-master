import Vue from 'vue'
import AlpsList from "./AlpsList";
import DeleteDialog from "./DeleteDialog";
import EditDialog from "./EditDialog";
import EntityDetails from "./EntityDetails";

const commons = {
    AlpsList,
    DeleteDialog,
    EditDialog,
    EntityDetails
};

Object.keys(commons).forEach(name=>{
    Vue.component(name,commons[name]);
});

export default commons;
