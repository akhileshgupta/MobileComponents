"use strict";

(function($) {

    // The top level namespace
    var SFDC = {};

    // Define a Base SFDC View to take care of common tasks on each view,
	// such as: a) setting the right options on the view object directly vs options attribute
	// b) Attach the view instance to the DOM element
	// c) Attach "render" event listener
	SFDC.View = Backbone.View.extend({
		constructor: function(options) {
			var classProps = [];
			var getProtoProps = function(proto) {
				classProps = _.union(classProps, _.keys(proto));
				if (proto.__proto__) getProtoProps(proto.__proto__);
			}
			getProtoProps(this.__proto__);

			// Attach the part of options directly on the View, if defined on the view.
			_.extend(this, _.pick(options, classProps));
			// Call the parent's default constructor with only options not defined directly on the View.
			Backbone.View.apply(this, [_.omit(options, classProps)]);
		},
		initialize: function(options) {
			// Call parent's initialize first
			Backbone.View.prototype.initialize.apply(this, arguments);
			// Attach the view instance to the respective DOM element
			this.$el.view(this);
			// Flatten all prototype methods so as to easily attach event listeners
			_.bindAll(this);
			// Attach "render" event listener on global dispatcher. Initiate 'render' when received.
			this.listenTo(SFDC.eventDispatcher, 'render', this.render);
		}
	});

	/* TBD: Need to figure out what should we allow user to change and what attributes cannot be changed once the view is instantiated */
	// ListView Class to render a list view of salesforce records
	// list View can be configured using following params:
	// SObject: Type of sobject on which you want to render a list
	// NOT NEEDED - type: Type of list (MRU, SOQL, SOSL, cache)
	// query: SOQL/SOSL/SmartSQL statement to fetch the records
	// template: custom template element id, that should be used to render the view
	SFDC.ListView = SFDC.View.extend({
		sobject: null,
		//type: null,
		query: null,
		template: null
	});

	// SObjectView Class to render a detail/edit layout of a sobject record.
	// Can be configured using following params:
	// SObject: Type of sobject on which you want to render a list
	// recordid: Id of the record that should be rendered
	// hasrecordtypes: (true/false, Default: false). Flag to support record types in the view
	// fields: List of fields that should only be rendered on the view
	// template: custom template element id, that should be used to render the view
	SFDC.SObjectView = SFDC.View.extend({
		sobject: null,
		fields: null,
		recordid: null,
		hasrecordtypes: false,
		template: null
	});

	// DetailView Class to render a detail layout of a sobject record.
	// Can be configured using following params:
	// SObject: Type of sobject on which you want to render a list
	// recordid: Id of the record that should be rendered
	// hasrecordtypes: (true/false, Default: false). Flag to support record types in the view
	// fields: List of fields that should only be rendered on the view
	// template: custom template element id, that should be used to render the view
	SFDC.DetailView = SFDC.SObjectView.extend();

	// FormView Class to render a form layout of a sobject record to edit or create record.
	// Can be configured using following params:
	// SObject: Type of sobject on which you want to render a list
	// recordId: Id of the record that should be rendered
	// fields: List of fields that should only be rendered on the view
	// template: custom template element id, that should be used to render the view
	SFDC.FormView = SFDC.SObjectView.extend();

	// SObjectController is the base controller used by the Detail and FormViews to interact with SObject Data
	var SObjectController = function() {};
	SObjectController.prototype = {};

	// ListController is the controller for ListView and performs all the logic to generate data models.
	var ListController = function() {};
	ListController.prototype = {};

	// Set up inheritance for the controllers
	SObjectController.extend = ListController.extend = Backbone.Model.extend;

	// Global Events Dispatcher to loosely couple all the views
	SFDC.eventDispatcher = _.extend({}, Backbone.Events);

    SFDC.isOnline = function() {
        return navigator.onLine || 
               (typeof navigator.connection != 'undefined' &&
               navigator.connection.type !== Connection.UNKNOWN &&
               navigator.connection.type !== Connection.NONE);
    }

	//SFDC.launch
	SFDC.launch = function(options) {
        var opts = {apiVersion: '28.0', userAgent: 'SalesforceMobileUI/alpha'};
        options = _.extend(opts, options);
        Force.init(options, 'v' + options.apiVersion);
        if (navigator.smartstore) {
            SFDC.dataStore = new Force.StoreCache('sobjects', [{path:'Name', type:'string'}, {path:'attributes.type', type:'string'}], 'Id');
            SFDC.metadataStore = new Force.StoreCache('sobjectTypes', [], 'type');
            SFDC.dataStore.init();
            SFDC.metadataStore.init();
        }
        parseDOM();
        setTimeout(function() { SFDC.eventDispatcher.trigger('render'); }, 0);
    }

    _.extend(SFDC.ListView.prototype, {
    	initialize: function(options) {
    		var _self = this;

    		SFDC.View.prototype.initialize.apply(this, arguments);
    		this.collection = new Force.SObjectCollection();
    		this.listenTo(this.collection, 'add remove change', function() {
    			setTimeout(function() { _self.trigger('contentChanged'); }, 0);
    		});
    		this.fetch();
    	},
    	rerender: function() {
    		this.fetch().render();
    		return this;
    	},
    	render: function() {
    		var _self = this,
    			template = getTemplateFor(this.template);
    		if (!template) {
    			template = createTemplateFromMarkup(T.listLayout);
    			this.$el.empty().append(template);
    		}
    		template.model = this.collection;
    		setTimeout(function() { _self.trigger('afterRender'); }, 0);

    		return this;
    	},
    	fetch: function() {
            var _self = this,
                config = {};

			// fetch list from forcetk and populate SOBject model
            if (SFDC.isOnline()) {
                if (_self.query) {
                    config.type = 'soql';
                    config.query = _self.query;
                } else if (_self.sobject) {
                    config.type = 'mru';
                    config.sobjectType = _self.sobject;
                }
            } else if (navigator.smartstore) {
                config.type = 'cache';
                config.cacheQuery = navigator.smartstore.buildExactQuerySpec('attributes.type', _self.sobject);
            }

            var checkMore = function() {
                if (_self.collection.hasMore() && _self.maxsize > _self.collection.length) 
                    _self.collection.getMore().then(checkMore);
            }
            _self.collection.fetch({config: config, cache: SFDC.dataStore, success: checkMore});;

            return this;
        }
    });

	var SObjectViewHelper = function(type) {
		this.sobjectType = getSObjectType(type);
		this.initialize();
	}

	_.extend(SObjectViewHelper.prototype, {

		initialize: function() {
			this._detailTemplates = {};
			this._editTemplates = {};
		},

		getLayoutTemplate: function(recordTypeId, type) {
			var templateInfoMap = (type == 'edit') ? this._editTemplates : 
							  this._detailTemplates;

			var parse = function(layoutInfo) {
				var sections = (type == 'edit') ? layoutInfo.editLayoutSections : 
							   layoutInfo.detailLayoutSections;
				return compileLayout(sections);
			}

			return $.when(templateInfoMap[recordTypeId] ||
						this.sobjectType.describeLayout(recordTypeId)
					   .then(parse)
					   .then(function(templateInfo) {
					   		templateInfoMap[recordTypeId] = templateInfo;
					   		return templateInfo;
					   })
					);
		},

		getDetailTemplate: function(recordTypeId) {
			return this.getLayoutTemplate(recordTypeId, 'detail');
		},

		getEditTemplate: function(recordTypeId) {
			return this.getLayoutTemplate(recordTypeId, 'edit');
		},

		reset: function() {
			this.sobjectType.reset();
			this.initialize();
		}
	});

    var SObjectViewModel = function(model) {
        var _self = this;

        var setupProps = function(props) {
            props.forEach(function(prop) {
                _self.__defineGetter__(prop, function() { return model.get(prop); })
                _self.__defineSetter__(prop, function(val) { model.set(prop, val); })
            });
        }
        model.on('change', function() {
            setupProps(_.difference(_.keys(model.attributes), _.keys(_self)));
        });
        setupProps(_.keys(model.attributes));
    }

	_.extend(SFDC.SObjectView.prototype, {
    	initialize: function(options) {
    		var _self = this;

    		SFDC.View.prototype.initialize.apply(this, arguments);
    		
    		this._viewHelper = new SObjectViewHelper(this.sobject);
    		/* TBD: Not sure what to do for this listener
    		this.listenTo(this.model, 'change', function() {
    			_self.render();
    			setTimeout(function() { _self.trigger('contentChanged'); }, 0);
    		});*/
    		this.prepare().fetch();
    	},
    	prepare: function() {
    		var _self = this,
    			statusDeferred = $.Deferred();

    		_self._statusMonitor = statusDeferred.promise();

    		if (_self.sobject) {
    			var Model = Force.SObject.extend({ sobjectType: _self.sobject });
    			_self.model = new Model({
	    			Id: _self.recordid, 
	    			recordTypeId: _self.options.recordtypeid 
	    		});
	    	}
            	
            //TBD: Check If template is specified, fields should also be specified.
            var template = getTemplateFor(_self.template);
            if (template) {
            	_self._statusMonitor.resolve({
            		template: template,
            		fields: _self.fields.split(',')
            	});
            } else if (_self.model) {
            	var recordTypeId = (_self.hasrecordtypes) ? _self.model.get('recordTypeId') : '012000000000000AAA';

            	var fetchTemplateInfo = function(recordTypeId) {
            		// Fetch the layout template info using the Sobject View Helper
            		_self.getTemplate(recordTypeId).then(function(templateInfo) {
            			// Check if the current view's monitor has been replaced by another promise.
            			// If no, continue to resolve. Else reject the old deferred.
	        			if (_self._statusMonitor === statusDeferred.promise()) 
	        				statusDeferred.resolve(templateInfo);
	        			else statusDeferred.reject();
	        		});
            	}

	            // Case Y: We have the model's record type id
	        	if (recordTypeId) fetchTemplateInfo(recordTypeId);
	        	// Case N: We don't have model's record type id
	        	else if (_self.model.id) {
	        		// Fetch the record type id of the current model
	        		_self.model.fetch({ 
	        			fieldlist: 'recordTypeId', 
	        			success: function() { fetchTemplateInfo(_self.model.get('recordTypeId')); } 
	        		});
	        	}
	        }

	        return this;
    	},
    	rerender: function() {
    		this.prepare().fetch().render();
    	},
    	render: function() {
    		var _self = this;

    		_self._statusMonitor.done(function(templateInfo) {
    			var template = templateInfo.template;
    			if (_self.$el.has(template).length == 0) _self.$el.empty().append(template);
    			template.model = new SObjectViewModel(_self.model);
    			setTimeout(function() { _self.trigger('afterRender'); }, 0);
    		});

    		return this;
    	},
        fetch: function() {
            var _self = this;

            _self._statusMonitor.done(function(templateInfo) {
            	if (_self.model.id) {
	            	console.log('fetching record');
	    			var fields = templateInfo.fields;
	    			_self.model.fetch({ 
	    				fieldlist: fields,
	    				cache: SFDC.dataStore,
	    				cacheMode: cacheMode(),
	    				success: function() { _self.model.trigger('synced'); }
	    			});
	    		}
    		});

            return this;
        }
    });

	_.extend(SFDC.DetailView.prototype, {
		getTemplate: function(recordTypeId) {
			return this._viewHelper.getDetailTemplate(recordTypeId);
		}
	});

	_.extend(SFDC.FormView.prototype, {
		getTemplate: function(recordTypeId) {
			return this._viewHelper.getEditTemplate(recordTypeId);
		},

		render: function() {
			var _self = this;
			_self._changedAttributes = [];
			if (_self.model) {
				_self.model.on('synced', function() { _self._changedAttributes = []; });
				_self.model.on('change', function() {
					var changedFields = _.keys(_self.model.changedAttributes());
					changedFields = changedFields.filter(function(field) {
						return field.indexOf('__') != 0;
					})
					_self._changedAttributes = _.union(_self._changedAttributes, changedFields);
				});
			}
			return SFDC.SObjectView.prototype.render.apply(_self, arguments);
		},

		save: function() {
			var _self = this,
				saveMonitor = $.Deferred();

			var onSuccess = function() {
				saveMonitor.resolve();
				_self.model.trigger('synced');
			}

			var onError = function(model, xhr) {
				var viewErrors = {messages: []};
                _.each(new Force.Error(xhr).details, function(detail) {
                    if (detail.fields == null || detail.fields.length == 0) {
                        viewErrors.messages.push(detail.message);
                    } else {
                        _.each(detail.fields, function(field) {
                            viewErrors[field] = detail.message;
                        });
                    }
                });
                _self.$el.children('template')[0].model['__errors__'] = viewErrors;
                saveMonitor.reject();
			}

			_self.model.unset('__errors__');
            _self.model.save(null, {
            	fieldlist: _self._changedAttributes,
            	cache: SFDC.dataStore, 
            	cacheMode: cacheMode(),
            	success: onSuccess, 
            	error: onError 
            });

            return saveMonitor.promise();
		}
	});

	//------------------------- INTERNAL METHODS -------------------------
    var getTemplateFor = function(template){
        if (template) {
            if (_.isString(template)) return document.getElementById(template);
            else if (template instanceof HTMLTemplateElement) return template;
        }
    }

    var cacheMode = function() {
    	return SFDC.isOnline() ? Force.CACHE_MODE.SERVER_FIRST : Force.CACHE_MODE.CACHE_ONLY;
    }

    // Utility method to ensure that input object is an array. 
    // If not, wraps the input object into array.
    var modArray = function(obj) {
        if (!(obj instanceof Array)) 
            if (obj) return [obj];
            else return [];
        else return obj;
    }

    var createTemplateFromMarkup = function (markup, bindingDelegate) {
        // Templatize the markup
        var helperTemplate = document.createElement('template');
        helperTemplate.setAttribute('bind', '')
        helperTemplate.innerHTML = markup;

        HTMLTemplateElement.decorate(helperTemplate);
        if (bindingDelegate) helperTemplate.bindingDelegate = bindingDelegate;

        return helperTemplate;
    }

    // Handlebar helper function to render the date and datetime fields properly.
    //TBD: See if we need to do anything for escaping values for HTML or JS content.
    var FieldDisplaySyntax = {
        getBinding: function(model, path, name, node) {
        	var pathParts = path.split(':');
        	var type = null;
        	if (path.length == 0) return;
        	else if (pathParts.length == 2) {
        		type = pathParts[0];
        		path = pathParts[1];
        	}
            
            var typeRenderer = function(type, value) {
            	if (value) {
                    if (type == 'date') value = new Date(value).toDateString();
                    else if (type == 'datetime') {
                        var a = value.split(/[^0-9]/);
                        value = new Date(a[0],a[1]-1,a[2],a[3],a[4],a[5]).toLocaleString();
                    }
                }
                return value;
            }

	        if (type != null) {
	            var binding = new CompoundBinding(function(values) {
	                return typeRenderer(type, values['value']);
	            });

	            binding.bind('value', model, path);
	            return binding;
	        }
        }
    };

    var SObjectTypeMap = {};
    var getSObjectType = function(type) {
    	type = type.toLowerCase();
        var sobject = SObjectTypeMap[type];
        if (!sobject && type) {
            sobject = new Force.SObjectType(type, SFDC.metadataStore);
            SObjectTypeMap[type] = sobject;
        }
        return sobject;
    }

    var parseDOM = function() {
    	$("[sf-role]").each(function() {
            var parent = $(this), 
                view, options = {};

            $(this.attributes).each(function() {
                if (this.nodeName.substr(0,3) == 'sf-') 
                    options[this.nodeName.substr(3)] = this.nodeValue;
            });
            options.el = parent[0];

            if (parent.attr('sf-role') == 'list') view = new SFDC.ListView(options);
            else if (parent.attr('sf-role') == 'detail') view = new SFDC.DetailView(options);
            else if (parent.attr('sf-role') == 'edit') view = new SFDC.FormView(options);
        });
    }

    $.fn.view = function(view) {
    	return (view) ? this.data('sf-view', view) : this.data('sf-view');
    }

    //--------------------- DEFAULT TEMPLATES & GENERATION ------------------------
    // Default layout template for list view
    //TBD: figure out what to do for {{yield}}
    var T = {};
    T.listLayout = '<ul><template repeat="{{models}}"><li id="{{attributes.Id}}" class="sf-list-item">{{attributes.Name}}</li></template></ul>';

    // Generates layout template for specific fields. Used by the DetailController.
    // TBD: Support the parent look up fields
    var compileLayoutForFields = function(fields, fieldSet, fieldInfoMap) {
        var row = {layoutItems: [], columns: 2}, 
            column = 1, item,
            section = {heading: '', layoutRows:[]};

        modArray(fields).forEach(function(field) {
            item = {placeholder:"false", editable: "true", label: fieldInfoMap[field].label, layoutComponents: {type: 'Field', value: field}};
            row.layoutItems.push(item);

            if (column++ == 2) {
                section.layoutRows.push(row);
                row = {layoutItems: [], columns: 2};
                column = 1;
            }
        });
        if (row.layoutItems.length) section.layoutRows.push(row);

        return compileLayout({detailLayoutSections: section, editLayoutSections: section}, fieldSet, fieldInfoMap);
    }

    // Generates handlebar template for a layout object, which is returned by describeLayout api call.
    /* Sample template HTML: 
        ```html
        <div class="sf-layout-section">
            <h1 class="sf-layout-section-heading">{{Section Heading}}</h1>
            <div class="sf-layout-row">
                <div class="sf-layout-item">
                    <div class="sf-layout-item-label">{{Item Label}}</div>
                    {{#if forEdit}}<div class="sf-layout-item-error">{{Save Error for related fields}}</div>{{/if}}
                    ...
                    <div class="sf-layout-item-value">
                        <span class="{{field type}}" data-field-name="{{field Name}}">
                            {{#if not forEdit}}{{fieldValue}}{{/if}}
                            {{#if forEdit}}{{view Ember.InputView valueBinding="fieldValue"}}{{/if}}
                        </span>
                        ...
                    </div>
                </div>
                ...
            </div>
            ...
        </div>
        ...
        ```
    */
    //TBD: Allow way to hide empty values
    //TBD: Allow way to show selective field types
    var compileLayout = function(layoutSections) {
        
        // Utility method to return input element type for a corresponding salesforce field type.
        var inputType = function(fieldType) {
            switch(fieldType) {
                 case "int": return "number";
                 case "double": return "number";
                 case "percent": return "number";
                 case "phone": return "tel";
                 case "date": return "date";
                 case "datetime": return "datetime";
                 case "time": return "time";
                 case "url": return "url";
                 case "email": return "email";
                 default: return "text";
            }
        }

        // Generates and returns a Handlebar template for a specific field.
        // If forEdit is true and if field is editable, method returns an input type element. 
        var generateFieldTemplate = function(fieldName, fieldInfo, displayField, forEdit) {
            var fieldType = fieldInfo.type,
                html = '<span class="' + fieldType + '" data-field-name="' + fieldName + '">';

            if (forEdit) {
                if (fieldType == 'boolean') 
                    html += ('<input type="checkbox" checked="{{' + displayField + '}}"/>');
                else if (fieldType == 'picklist') {
                    html += '<select value="{{' + displayField + '}}">';
                    fieldInfo.picklistValues.forEach(function(option){
                        html += ('<option value="' + option.value + '">' + option.label + '</option>');
                    })
                    html += '</select>';
                } else if (fieldType == 'textarea')
                    html += ('<input type="textarea" value="{{' + displayField + '}}"/>');
                else 
                    html += ('<input value="{{' + displayField + '}}" type="' + inputType(fieldType) + '" maxlength="' + fieldInfo.length + '"/>');
            }
            else {
                if (fieldType == 'boolean') 
                    html += ('<input type="checkbox" checked="{{' + displayField + '}}" disabled="true"/>');
                else if (fieldInfo.htmlFormatted) //TBD: See if we need to do anything for HTML type fields in polymer.
                    html += '{{' + displayField + '}}';
                else html += ('{{' + fieldInfo.type + ':' + displayField + '}}');
            }
            return html + '</span>';
        }

        // Generates and returns the handlebar template for the layout sections.
        var html = '';
        var layoutFieldSet = [];

        layoutSections.forEach(function(section, sectionIndex) {
            html += '<div class="sf-layout-section">';
            html += ('<h1 class="sf-layout-section-heading">' + section.heading + '</h1>');
            // Iterate over layout rows in each section
            modArray(section.layoutRows).forEach(function(row) {
                html += '<div class="sf-layout-row ui-responsive">';
                // Iterate over layout items in each row
                modArray(row.layoutItems).forEach(function(item) {
                    html += '<div class="sf-layout-item' + ((+section.columns > 1) ? ' ui-block' : '') + '">';
                    if (!item.placeholder) {
                        html += ('<div class="sf-layout-item-label">' + item.label + '</div>');
                        var errorHtml = '';
                        var valueHtml = '<div class="sf-layout-item-value">';
                        // Iterate over layout item component in each item
                        modArray(item.layoutComponents).forEach(function(comp) {
                            var isFieldEditable = false;
                            if (comp.type == 'Separator') valueHtml += comp.value;
                            else if (comp.type == 'Field' && !/__XyzEncoded__s$/.test(comp.value)) { // Add a special case to ingnore weird geo location field which adds internal field to layout (*__XyzEncoded__s)
                                var displayField = comp.value; // Default display field as the field of component
                                var fieldInfo = comp.details; // Fetch the field info to check if it's a relationship
                                layoutFieldSet.push(comp.value); // Track the field required for this layout
                                if (fieldInfo.type == 'reference') {
                                    displayField = fieldInfo.relationshipName;
                                    displayField += (fieldInfo.referenceTo == 'Case' ? '.CaseNumber' : '.Name');
                                    layoutFieldSet.push(displayField);
                                }
                                // check if field is editable based on the field type information and the layout settings. Also ignore refrence type fields as we don't currently support the edit for that.
                                isFieldEditable = (item.editable && fieldInfo.type != 'reference' && fieldInfo.updateable);
                                valueHtml += generateFieldTemplate(comp.value, fieldInfo, displayField, isFieldEditable);
                                if (isFieldEditable) errorHtml += '<div class="sf-layout-item-error">{{__errors__.' + comp.value + '}}</div>';
                            }
                        });
                        html += (errorHtml + valueHtml + '</div>');
                    }
                    html += '</div>';
                });
                html += '</div>';
            });
            html += '</div>';

            console.log ('layout section template: ' + html);
        });

        // Templatize the markup
        return { 
        	template: createTemplateFromMarkup(html, FieldDisplaySyntax),
        	fields: layoutFieldSet
        };
    }

	window.SFDC = SFDC;

})(jQuery);