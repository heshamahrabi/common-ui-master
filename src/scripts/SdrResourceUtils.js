import Ketting from 'ketting'
import url from 'url'

export default {
    kettingFromServer(server) {
        return new Ketting(server)
    },
    kettingFromUri(uri) {
        return this.kettingFromServer(url.parse(uri).server);
    },
    resourceFromUri(uri) {
        // this  can be called without an existing ketting instance, since it received a complete uri including the server path.
        return this.kettingFromUri(uri).go(uri);
    },
    async fetchJsonSchema(resourceName, ketting) {
        // Get the resource (url to the schema), then get its response (actual schema), then apply it
        let jsonSchemaHeaders = new Headers();
        jsonSchemaHeaders.append('Accept', 'application/schema+json');
        let resource = await ketting.go().follow('profile').follow(resourceName);
        let response = await resource.fetch({headers: jsonSchemaHeaders});
        let json = await response.json();
        return json;
    },

    async fetchAlpsSchema(resourceName, ketting) {
        // Get the resource (url to the schema), then get its response (actual schema), then apply it
        let resource = await ketting.go().follow('profile').follow(resourceName);
        let alpsSchema = await resource.get();
        return alpsSchema;
    },


    /**
     * Parses the given Url String to get the resource name from it (typically the pluralized entity name)
     * @param urlString
     * @returns {string}
     */
    getResourceNameFromProfileUrl(urlString) {
        let urlObject = url.parse(urlString);
        return urlObject.path.substring(urlObject.path.lastIndexOf('/') + 1);
    },

    /**
     * Parses the given Url String to get the server path incl. protocol and host, i.e.:
     * https://intrafact.de/legal-entity
     * Note that this is done heuristically (taking the path up to "profile") and may therefore not be very stable!
     * @param urlString
     * @returns {string}
     */
    getServerFromProfileUrl(urlString) {
        let urlObject = url.parse(urlString);
        return urlObject.protocol + "//" + urlObject.host + "/" + urlObject.path.substring(0, urlObject.path.indexOf("profile"));
    },

    /**
     * Returns the type of a field according to a JSON schema
     * @param jsonSchema
     * @param fieldName
     * @returns {string|*}
     */
    getFieldTypeFromSchemaJson(jsonSchema, fieldName) {
        let field = jsonSchema.properties[fieldName];
        if (field.enum)
            return "enum";
        else if (field.format)
            return field.type + '/' + field.format;
        else return field.type;
    }
}