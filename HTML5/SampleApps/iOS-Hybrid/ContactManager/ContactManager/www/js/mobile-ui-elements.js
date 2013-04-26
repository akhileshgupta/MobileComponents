"use strict";

(function($) {

	// The top level namespace
	var SFDC;

	// Map for default templates
	var T = {};

	//------------------------- INTERNAL METHODS -------------------------//
	// Utility method to ensure that input object is an array. 
	// If not, wraps the input object into array.
	var modArray = function(obj) {
		if (!(obj instanceof Array)) 
			if (obj) return [obj];
			else return [];
		else return obj;
	}

	// Generatea layout template for specific fields. Used by the DetailController.
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
	*/
	//TBD: Allow way to hide empty values
	//TBD: Allow way to show selective field types
	var compileLayout = function(layout, layoutFieldSet, fieldInfoMap) {
		
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
					html += ('{{input type=checkbox checked=' + displayField + '}}');
				else if (fieldType == 'picklist')
					html += ('{{view Ember.Select contentBinding="view.fieldInfoMap.' + fieldName + '.picklistValues" optionLabelPath="content.label" optionValuePath="content.value" valueBinding="' + displayField + '"}}');
				else if (fieldType == 'textarea')
					html += ('{{textarea value=' + displayField + '}}');
				else 
					html += ('{{input value=' + displayField + ' type="' + inputType(fieldType) + '" maxlength="' + fieldInfo.length + '"}}');
			}
			else {
				if (fieldType == 'boolean') 
					html += ('{{input type=checkbox checked=' + displayField + ' disabled="true"}}');
				else if (fieldInfo.htmlFormatted) 
					html += '{{{' + displayField + '}}}';
				else html += ('{{fieldDisplay ' + displayField + ' type="' + fieldInfo.type + '"}}');
			}
			return html + '</span>';
		}

		// Generates and returns the handlebar template for the layout sections.
		var generateLayoutTemplate = function(sections, forEdit) {
			var html = '';

			sections.forEach(function(section) {
				html += '<div class="sf-layout-section">';
				html += ('<h1 class="sf-layout-section-heading">' + section.heading + '</h1>');
				// Iterate over layout rows in each section
				modArray(section.layoutRows).forEach(function(row) {
					html += '<div class="sf-layout-row ui-responsive">';
					// Iterate over layout items in each row
					modArray(row.layoutItems).forEach(function(item) {
						html += '<div class="sf-layout-item' + ((+section.columns > 1) ? ' ui-block' : '') + '">';
						if (item.placeholder == 'false') {
							html += ('<div class="sf-layout-item-label">' + item.label + '</div>');
							var errorHtml = '';
							var valueHtml = '<div class="sf-layout-item-value">';
							// Iterate over layout item component in each item
							modArray(item.layoutComponents).forEach(function(comp) {
								var isFieldEditable = false;
								if (comp.type == 'Separator') valueHtml += comp.value;
								else if (comp.type == 'Field' && !/__XyzEncoded__s$/.test(comp.value)) { // Add a special case to ingnore weird geo location field which adds internal field to layout (*__XyzEncoded__s)
									var displayField = comp.value; // Default display field as the field of component
									var fieldInfo = fieldInfoMap[comp.value]; // Fetch the field info to check if it's a relationship
									layoutFieldSet.add(comp.value); // Track the field required for this layout
									if (fieldInfo.type == 'reference') {
										displayField = fieldInfo.relationshipName;
										displayField += (fieldInfo.referenceTo == 'Case' ? '.CaseNumber' : '.Name');
										layoutFieldSet.add(displayField);
									}
									displayField = 'view.context.' + displayField; //Attach view context to help rendering
									// check if field is editable based on the field type information and the layout settings. Also ignore refrence type fields as we don't currently support the edit for that.
									isFieldEditable = (item.editable == 'true' && fieldInfo.type != 'reference' && fieldInfo.updateable);
									valueHtml += generateFieldTemplate(comp.value, fieldInfo, displayField, (forEdit && isFieldEditable));
									if (isFieldEditable) errorHtml += '<div class="sf-layout-item-error">{{view.errors.' + comp.value + '}}</div>';
								}
							});
							html += ((forEdit ? errorHtml : '') + valueHtml + '</div>');
						}
						html += '</div>';
					});
					html += '</div>';
				});
				html += '</div>';
			});
			console.log ('layout template: ' + html);
			return Ember.Handlebars.compile(html);
		};

		return {
			// Templatize detail layout sections
			detailLayout: generateLayoutTemplate(modArray(layout.detailLayoutSections)),
			// Templatize edit layout sections
			editLayout: generateLayoutTemplate(modArray(layout.editLayoutSections), true)
		};
	}

	//--------------------- DEFAULT TEMPLATES ------------------------//
	// Default layout template for list view
	T.listLayout = Ember.Handlebars.compile('<ul>{{#each controller}}<li {{bindAttr id="Id"}} class="sf-list-item">{{yield}}</li>{{/each}}</ul>');
	// Default template for list item
	T.list = Ember.Handlebars.compile('{{Name}}');
	// Default template for detail view
	T.detail = Ember.Handlebars.compile('<div>Id: {{Id}}</div><div>Name: {{Name}}</div>');

	// Handlebar helper function to render the date and datetime fields properly.
	Ember.Handlebars.registerBoundHelper('fieldDisplay', function(value, options) {
		var str = '', a;
		if (value) {
			if (options.hash.type == 'date') str = new Date(value).toDateString();
			else if (options.hash.type == 'datetime') {
				a = value.split(/[^0-9]/);
				str = new Date(a[0],a[1]-1,a[2],a[3],a[4],a[5]).toLocaleString();
			} else str = Handlebars.Utils.escapeExpression(value);
		}
		return new Handlebars.SafeString(str);
	});

	//--------------------- EMBER APPLICATION DEFINITION AND IMPLEMENTATION ------------------------//
	// Create a new singleton instance of Application under SFDC namespace
	SFDC = Ember.Application.create({
		LOG_TRANSITIONS: false,
		/**
		  Primary method to be invoked for activating the framework 
		  and to allow the processing of exiting dom elements.

		  @method launch
		  @param {object} options Object with accessToken, instanceUrl and apiVersion(optional) properties
		*/
		launch: function(options) {
			var opts = {apiVersion: '27.0', userAgent: 'SalesforceMobileUI/alpha'};
			options = _.extend(opts, options);
			Force.init(options, 'v' + options.apiVersion);
			sforce.connection.init(options.accessToken, options.instanceUrl + '/services/Soap/u/' + options.apiVersion, options.useProxy);
			if (navigator.smartstore) {
				SFDC.dataStore = new Force.StoreCache('sobjects', [{path:'Name', type:"string"}], 'Id');
				SFDC.metadataStore = new Force.StoreCache('sobjectTypes', [], 'type');
				SFDC.dataStore.init();
				SFDC.metadataStore.init();
			}
			SFDC.advanceReadiness();
		},
		/**
		  Utility method to get the instance of Controller that manages a particular view.
		  
		  @method getViewController
		  @param {String} id Id of the dom element that is managed by the Framework.
		*/
		getViewController: function(id) {
			return SFDC.components.findProperty('id', id);
		},
		/**
		  Utility method to get the singleton instance of a SFDC.SObject for a particular type.
		  
		  @method getSObject
		  @param {String} type Type of the SObject. Eg. Account, Contact etc.
		*/
		getSObject: function(type) {
			type = type.toLowerCase();
			var sobject = SFDC.sobjects.findProperty('type', type);
			if (!sobject && type) {
				sobject = SFDC.SObject.create({type: type});
				SFDC.sobjects.add(sobject);
			}
			return sobject;
		}
	});
	// Pause the readiness of the framework until the SFDC.launch() is called and the API session info is set.
	SFDC.deferReadiness();

	// Disable the url change by the Ember router
	SFDC.Router.reopen({ location: 'none' });

	/**
	  An instance of SFDC.SObject provides utility methods for 
	  reading various metadata properties of a sobject type.
	  Create a new instance of SFDC.SObject by calling SFDC.SObject.create({type: sobject}) 
	  and passing the type name of the sobject as the argument. 
	*/
	SFDC.SObject = Ember.Object.extend({
		id: null,
		type: null,
		init: function() {
			// Instantiate a new instance of Force.SObjectType
			this._sobjectType = new Force.SObjectType(this.type, SFDC.metadataStore);
		},
		/**
		  Retrieves the metadata info of the sobject.

		  @method metadata
		  @returns {jQuery.Promise} A promise object that resolves with the metadata result on success.
		*/
		metadata: function() {
			// Delegate the metadata call to the Force.SObjectType
			return this._sobjectType.getMetadata();
		},
		/**
		  Retrieves the describe info of the sobject.

		  @method describe
		  @returns {jQuery.Promise} A promise object that resolves with the describe result on success.
		*/
		describe: function() {
			// Delegate the describe call to the Force.SObjectType
			return this._sobjectType.describe();
		},
		/**
		  Retrieves the map with field describe infos of the sobject.

		  @method getFieldInfoMap
		  @returns {jQuery.Promise} A promise object that resolves with the map of field describe infos.
		*/
		getFieldInfoMap: function() {
			return this.describe().then(function(describeResult) {
				var fieldInfoMap = {};
				// Iterate over the fields in describeResult and create a map with field names as the keys
				describeResult.fields.forEach(function(fieldInfo) {
					fieldInfoMap[fieldInfo.name] = fieldInfo;
				});
				return fieldInfoMap;
			});
		},
		/**
		  Retrieves the describe layout info of the sobject.

		  @method describeLayout
		  @returns {jQuery.Promise} A promise object that resolves with the describeLayout result on success.
		*/
		describeLayout: function() {
			var _self = this,
				d = $.Deferred();

			if (_self.type && !_self._describeLayoutResult) {
				sforce.connection.describeLayout(_self.type, null, function(resp) {
					_self._describeLayoutResult = resp;
					d.resolve(_self._describeLayoutResult);
				}, function() {
					d.reject(arguments);
				});
			} else d.resolve(_self._describeLayoutResult);

			return d.promise();
		}
	});

	/**
	  The ApplicationRoute definition for the SFDC Ember app.
	  This route is the first one to be initialized by Ember framework after app launch.
	*/
	SFDC.ApplicationRoute = Ember.Route.extend({
		// Definition of setupController for the ApplicationRoute. 
		// This method looks up all the exiting DOM elements with sf-role attributes
		// and initializes the corresponding controllers for them.
		setupController: function(controller, model) {
			var _self = this, idCount = 0;
			SFDC.components = new Ember.Set();
			SFDC.sobjects = new Ember.Set();

			$("[sf-role]").each(function() {
				var parent = $(this), 
					controller, settings = {};

				$(this.attributes).each(function() {
					if (this.nodeName.substr(0,3) == 'sf-') 
						settings[this.nodeName.substr(3)] = this.nodeValue;
				});
				settings.parent = parent;
				settings.id = this.id || ('sf-comp-' + idCount++);

				if (parent.attr('sf-role') == 'list') controller = SFDC.ListController.create(settings);
				else if (parent.attr('sf-role') == 'detail') controller = SFDC.DetailController.create(settings);

				SFDC.components.add(controller);
			});
			$(document).trigger('SFDCReady');
		}
	});

	/**
	  Contoller for managing the list view of an object.
	  Supported Options:
	  	sobject: Type of sobject for which list needs to be rendered.
	  	query:(Optional) SOQL statement from which list will be generated. Default: recent items.
	  	maxsize:(Optional) Maximum number of records to fetch from server. Default: 2000
	  	template:(Optional) Name of the Handlebar template to be used for rendering the DOM elements. Default: Renders a unordered list.
	  	itemTemplate:(Optional) Name of the Handlebar template to be used for rendering each item of the list. Default: Renders the name field.
	  Supported Events:
	  	afterRender: This event is triggered when the view is added to the DOM.
	  	contentChanged: This event is triggered when the records in the list change.
	*/
	SFDC.ListController = Ember.ArrayController.extend(Ember.Evented, {
		content: [],
		maxsize: 2000,
		init: function() {
			this._super();
			//Force cast maxsize to numeric value
			this.set('maxsize', +this.get('maxsize'));

			// Initialize view
			this.view = Ember.View.create().appendTo(this.parent);

			// Begin data fetch
			this.fetch();
			this.renderView();
		},
		fetch: function() {
			var _self = this,
				config = {},
				populateList = function(records) {
					var sobjects = [];
					records.forEach(function(obj) {
						sobjects.push(obj);
					});
					_self.pushObjects(sobjects);
				};

			// fetch list from forcetk and populate SOBject model
			if (_self.query) {
				config.type = 'soql';
				config.query = _self.query;
			} else if (_self.sobject) {
				config.type = 'mru';
				config.sobjectType = _self.sobject;
			}

			//TBD: Add max size option on the list Controller to handle cases of large resultsets.
			Force.fetchSObjects(config, SFDC.dataStore).done(function(resp) {
				var processFetchResult = function(records) {
					populateList(records);
					if (resp.hasMore() && _self.get('maxsize') > resp.records.length) 
						resp.getMore().done(processFetchResult);
				}
				processFetchResult(resp.records);
			});
		},
		renderView: function() {
			var _self = this, 
				viewProperties = {
					controller: _self,
					layout: (_self.template) ? undefined : T.listLayout,
					templateName: _self.itemtemplate || _self.template,
					template:  (_self.itemtemplate || _self.template) ? undefined : T.list
				};

			_self.view.setProperties(viewProperties).rerender();
			// Trigger an afterRender event once the DOM is updated with new template
			// Eg. Apply the jqm listview properties after that.
			_self.view.one('didInsertElement', function() {
				Ember.run.scheduleOnce('afterRender', _self, function() {
		        	this.trigger('afterRender');
		        });
			});
		},
		// Observe the attached content array and if changed trigger contentChanged event on the next RunLoop tick.
	    contentDidChange: function() {
	        Ember.run.scheduleOnce('afterRender', this, function() {
	        	this.trigger('contentChanged');
	        });
	    }.observes('content', 'content.length')
	});

	/**
	  Contoller for managing the detail view of an object.
	  Supported Options:
	  	sobject: Type of sobject for which detail view needs to be rendered.
	  	record: Id of the record that needs to be rendered.
	  	fields:(Optional) Comma separated list of field names that should only be rendered on the detail page. Default: Renders all fields present on the page layout.
	  	layout:(Optional) Name of the Handlebar template to specify the layout of the output. Must contain {{yield}} to specify the place where template will be rendered. Default: None
	  	template:(Optional) Name of the Handlebar template to be used for rendering details of the record. Default: Renders the corresponding page layout.
	  Supported Events:
	  	afterRender: This event is triggered when the view is added to the DOM.
	  	contentChanged: This event is triggered when the record details change.
	*/
	SFDC.DetailController = Ember.ObjectController.extend(Ember.Evented, {
		ready: false,
		sobject: null,
		record: null,
		execOnceQueue: [],
		renderQueue: [],
		init: function() {
			this._super();
			this.view = Ember.View.create().appendTo(this.parent);
			this.fetchLayouts();
			this.fetch();
		},
		fetchLayouts: function() {
			var _self = this, 
				sobject;

			// Set to track all the fields to fetch to render layouts
			_self._layoutFieldSet = new Ember.Set();
			_self._layoutFieldSet.toString = function() {
				return this.reduce(function(prev, item, idx) {
					return prev + (idx > 0 ? ',' : '') + item;
				}, '');
			};

			if (!_self.template && _self.sobject) {
				// Mark the controller as not ready till we fetch layout infos and build templates
				_self.set('ready', false);

				sobject = SFDC.getSObject(_self.sobject);

				$.when(_self.fields || sobject.describeLayout(), sobject.getFieldInfoMap())
				.done(function(layoutDescribeResult, fieldInfoMap) {
					_self._layoutInfos = {};
					_self._recordTypeMappings = {};
					_self._fieldInfoMap = fieldInfoMap;

					if (layoutDescribeResult === _self.fields) {
						_self._defaultLayoutMapping = {layoutId: 0};
						_self._layoutInfos[0] = compileLayoutForFields(_self.fields.split(','), _self._layoutFieldSet, fieldInfoMap);
					} else {
						// Store the record types to layout mappings for available record types
						modArray(layoutDescribeResult.recordTypeMappings).forEach(function(mapping){
							if (mapping.available == 'true') 
								_self._recordTypeMappings[mapping.recordTypeId] = mapping;
							// Store the default layout mapping separately
							if (mapping.defaultRecordTypeMapping == 'true')
								_self._defaultLayoutMapping = mapping;
						});

						// Store the compiled layout infos in handle bar templates
						modArray(layoutDescribeResult.layouts).forEach(function(layout) {
							_self._layoutInfos[layout.id] = compileLayout(layout, _self._layoutFieldSet, fieldInfoMap);
						});
					}
					_self.set('ready', true);
				});
			} else _self.set('ready', true);
		}.observes('sobject'),
		fetch: function() {
			var _self = this;

			// fetch list from forcetk and populate SOBject model
			if (_self.ready && _self.record) {
				_self.set('content', {});
				Force.syncSObject('read', _self.sobject, _self.record, null, _self._layoutFieldSet.toString(), false, SFDC.dataStore, "server-first")
				.done(function(resp) {
					console.log(JSON.stringify(resp));
					_self.set('content', resp);
				}).fail(function() { console.log(arguments); });
			}

			return this;
		}.observes('record', 'ready'),
		renderView: function() {
			var _self = this, 
				layoutId,
				viewProperties = {
					controller: _self,
					layoutName: _self.layout,
					templateName: _self.template
				};

			if (!_self.ready) return;

			if (!viewProperties.templateName) {
				if (_self._layoutInfos) {
					layoutId = _self._recordTypeMappings[_self.get('recordTypeId')] || _self._defaultLayoutMapping.layoutId;
					viewProperties.template = _self._layoutInfos[layoutId].detailLayout;
				} else viewProperties.template = T.detail;
			}

			// Skip rerender if the selected view template is same as the one previously applied.
			if (_self.view.get('template') !== viewProperties.template) {
				_self.view.setProperties(viewProperties).rerender();
				// Trigger an afterRender event once the DOM is updated with new template
				_self.view.one('didInsertElement', function() {
					Ember.run.scheduleOnce('afterRender', _self, function() {
			        	this.trigger('afterRender');
			        });
				});
			}

			return this;
		}.observes('content', 'ready'),
		showEdit: function(target) {
			var _self = this,
				layoutId,
				viewProperties = {
					fieldInfoMap: _self._fieldInfoMap,
					context: Ember.copy(_self.get('content')),
					templateName: _self.editTemplate
				};

			$(target).empty();
			if (!_self.ready) return;

			if (!viewProperties.templateName) {
				if (_self._layoutInfos) {
					layoutId = _self._recordTypeMappings[_self.get('recordTypeId')] || _self._defaultLayoutMapping.layoutId;
					viewProperties.template = _self._layoutInfos[layoutId].editLayout;
				} else viewProperties.template = T.edit;
			}
			return SFDC.EditView.create(viewProperties).appendTo(target);
		},
		// Observe the attached content and if changed trigger contentChanged event on the next RunLoop tick.
	    contentDidChange: function() {
	        Ember.run.scheduleOnce('afterRender', this, function() {
	        	this.trigger('contentChanged');
	        });
	    }.observes('content')
	});

	/**
	  View class to manages the edit view of a record.
	*/
	SFDC.EditView = Ember.View.extend({
		init: function() {
			this._super();

			this.attributes = this.get('context').attributes;
			this.Id = this.get('context').Id;

			delete this.get('context').attributes;
		},
		/**
		  Method to save the current form values back to server.

		  @method save
		  @returns {jQuery.Promise} A promise object which resolves when save to server succeeds.
		*/
		save: function() {
			var _self = this,
				sobject = SFDC.getSObject(_self.attributes.type),
				record = Ember.copy(_self.get('context'));

			if (sobject && sobject.type) {
				return sobject.getFieldInfoMap().then(function(fieldInfoMap) {
					var fieldsToSave = [];
					Ember.keys(record).forEach(function(field) {
						if (typeof record[field] != 'object' && fieldInfoMap[field].updateable) fieldsToSave.push(field);
					});
					return Force.syncSObject('update', sobject.type, _self.Id, record, fieldsToSave, false, SFDC.dataStore, "server-first")
					.fail(function(xhr) {
						var viewErrors = {messages: []};
		                _.each(new Force.RestError(xhr).details, function(detail) {
		                    if (detail.fields == null || detail.fields.length == 0) {
		                        viewErrors.messages.push(detail.message);
		                    } else {
		                        _.each(detail.fields, function(field) {
		                            viewErrors[field] = detail.message;
		                        });
		                    }
		                });
		                _self.set('errors', viewErrors);
					});
				});
			}
		}
	});

	window.SFDC = SFDC;
})(jQuery);