(function(SFDC) {

    var viewProps = {
        sobject: "Account",
        recordid: "",
        fieldlist: "",
        idfield: "Id"
        /* autosave: false */ // Could add this property to allow auto save of model whenever it changes
    };

    Polymer('force-sobject', _.extend({}, viewProps, {
        init: function() {
            this.model = new (Force.SObject.extend({
                cache: SFDC.dataStore, //FIXME: Create separate data store for each sobjectype
                cacheMode: SFDC.cacheMode,
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