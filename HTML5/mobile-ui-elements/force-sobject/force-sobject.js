/*
    This component wraps the SmartSync Force.SObject into a polymer component.
    Why: a) Auto manages the offline store for caching.
    b) Provides a simpler DOM based interface to interact with Smartsync SObject Model.
    c) Allows other polymer components to easily comsume smartsync.
*/
(function(SFDC) {

    /* TBD: Need to figure out what should we allow user to change and what attributes cannot be changed once the view is instantiated */
    // ListView Class to render a list view of salesforce records
    // list View can be configured using following params:
    // SObject: (Required) Type of sobject on which you want to render a list
    // query: (Optional) SOQL/SOSL/SmartSQL statement to fetch the records.
    // querytype: Type of query (mru, soql, sosl, cache). Required if query is specified.
    var viewProps = {
        sobject: "Account",
        recordid: "",
        fieldlist: "",
        idfield: "Id"
        /* autosave: false */ // Could add this property to allow auto save of model whenever it changes
    };

    var cacheMode = function() {
        return SFDC.isOnline() ? Force.CACHE_MODE.SERVER_FIRST : Force.CACHE_MODE.CACHE_ONLY;
    }

    Polymer('force-sobject', _.extend({}, viewProps, {
        init: function() {
            this.model = new (Force.SObject.extend({
                cache: SFDC.dataStore, //FIXME: Create separate data store for each sobjectype
                cacheMode: cacheMode,
                sobjectType: this.sobject,
                fieldlist: this.fieldlist,
                idAttribute: this.idfield
            }));
            this.model.set(this.idfield, this.recordid);

            return this;
        },
        ready: function() {
            this.init();
            this.async(this.fetch);
        },
        reset: function() {
            if (!this.model ||
                this.model.sobjectType != this.sobject ||
                this.model.id != this.recordid ||
                this.model.idAttribute != this.idfield ||
                this.model.fieldlist != this.fieldlist) {

                //TBD: May be listen for the event when app is ready to do the fetch. Or fetch can be triggered by the consumer.
                this.init().fetch();
            }
            return this;
        },
        attributeChanged: function(attrName, oldVal, newVal) {
            // Doing asynchronous reset so that all simultaneous property changes can be processed before the refetch begins.
            this.async( this.reset );
        },
        fetch: function() {
            var that = this;
            //TBD: May be listen for the event when app is ready to do the fetch. Or fetch can be triggered by the consumer.
            if (this.model.sobjectType && this.model.id) SFDC.launcher.done(function() { that.model.fetch(); });
            else console.warn('sobject Type and recordid required for fetch.');

            return this;
        },
        save: function() {
            // Perform save (upsert) against the server
        },
        delete: function() {
            // Perform delete of record against the server
        }
    }));

})(window.SFDC);