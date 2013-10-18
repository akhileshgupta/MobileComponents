/*
    This component wraps the SmartSync Force.SObjectCollection into a polymer component.
    Why: a) Auto manages the offline store for caching.
    b) Provides a simple DOM based interface to interact with Smartsync.
    c) Allows other polymer components to easily comsume smartsync.
*/

"use strict";

(function(SFDC) {

    /* TBD: Need to figure out what should we allow user to change and what attributes cannot be changed once the view is instantiated */
    // ListView Class to render a list view of salesforce records
    // list View can be configured using following params:
    // SObject: (Required) Type of sobject on which you want to render a list
    // query: (Optional) SOQL/SOSL/SmartSQL statement to fetch the records.
    // querytype: Type of query (mru, soql, sosl, cache). Required if query is specified.
    var viewProps = {
        sobject: "Account",
        query: "",
        querytype: "mru"
        /* async: false */ // Optional property to perform fetch as a web worker operation. Useful for data priming.
    };

    var generateConfig = function(props) {
        var config = {};

        // Fetch if only sobject type is specified.
        if (props.sobject) {
            // Is device online
            if (SFDC.isOnline()) {
                // Send the user config for fetch
                config.sobjectType = props.sobject;
                config.type = props.querytype;
                config.query = props.query;
            }
            // Is device offline and smartstore is available
            else if (navigator.smartstore) {
                // Only run cache queries. If none provided, fetch all data.
                config.type = 'cache';
                if (props.querytype == 'cache' && props.query) config.query = props.query;
                else config.cacheQuery = navigator.smartstore.buildExactQuerySpec('attributes.type', props.sobject);
            }
            return config;
        }
        return null;
    }

    var cacheMode = function() {
        return SFDC.isOnline() ? Force.CACHE_MODE.SERVER_FIRST : Force.CACHE_MODE.CACHE_ONLY;
    }

    Polymer('force-data-collection', _.extend({}, viewProps, {
        ready: function() {
            this.collection = new (Force.SObjectCollection.extend({
                cache: SFDC.dataStore,
                cacheMode: cacheMode,
                config: generateConfig(_.pick(this, _.keys(viewProps)))
            }));

            //TBD: May be listen for the event when app is ready to do the fetch. Or fetch can be triggered by the consumer.
            this.async(this.fetch);
        },
        attributeChanged: function(attrName, oldVal, newVal) {
            var config = generateConfig(_.pick(this, _.keys(viewProps)));
            // FIXME: Polymer is calling this method multiple times for single attribute change.
            // That's why adding the isEqual check to prevent multiple server calls.
            if (!_.isEqual(config, this.collection.config)) {
                this.collection.config = config;
                this.async( this.fetch );
            }
        },
        fetch: function() {
            var that = this;
            SFDC.launcher.done(function() { that.collection.fetch({reset: true}); });
        }
    }));

})(window.SFDC);