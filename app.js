/**
 * Adress model
 */
var Address = AppModel.extend({
    defaults: {
        addressOne: '',
        addressTwo: '',
        city: '',
        state: '',
        zipCode: ''
    },
    validation: {
        addressOne: {
            required: true,
            message: 'The address is required'
        },
        state: {
            pattern: /^[A-Z]{2,}$/,
            message: 'The state should be two capital letters (ie "CA")'
        },
        zipCode: {
            pattern: /^\d{5,}$/,
            message: 'The zip code should be five digits (ie 61374)'
        }
    },
    /**
     * Method to return a string representation of address fields
     * @returns {string} - representation of address fields
     */
    getCalculatedAddress: function () {
        var self = this;
        return _.chain(['addressOne', 'city', 'state', 'zipCode'])
            .filter(function(el) {
                return self.attributes[el];
            })
            .map(function(el) {
                return self.attributes[el];
            }).value().join(', ');
    }
});

/**
 * Person model
 */
var Person = AppModel.extend({
    defaults: {
        firstName: '',
        lastName: '',
        address: new Address()
    },
    model: {
        'address': Address
    },
    validation: {
        firstName: {
            required: true,
            message: 'The first name is required'
        },
        lastName: {
            required: true,
            message: 'The last name is required'
        },
        address: {
            required: true
        }
    }
});

/**
 * Simple person list collection
 */
var PersonList = Backbone.Collection.extend({
    model: Person,
    /**
     * localStorage attribute allows saving the data into local storage
     */
    localStorage: new Backbone.LocalStorage("people")
});

/**
 * Person view
 */
var PersonView = Backbone.View.extend({
    template: Handlebars.compile($('#template-person-row').html()),
    events: {
        'click #app-edit-person': 'edit',
        'click #app-delete-person': 'clear'
    },
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
        this.$el.html(this.template(_.extend(this.model.toJSON(), {
            calculatedAddress: this.model && this.model.attributes.address && this.model.attributes.address.getCalculatedAddress()
        })));
        return this;
    },
    /**
     * edit method will trigger an event for other objects to listen and react
     */
    edit: function() {
        this.model.trigger('edit', this.model);
    },
    /**
     * Method to destroy the model and remove it from the local storage
     */
    clear: function() {
        this.model.destroy();
    }
});

/**
 * A view that contols the PersonView views
 */
var PersonListView = Backbone.View.extend({
    template: Handlebars.compile($('#template-person-list').html()),
    ui: {},
    collection: null,
    childrenViews: [],
    events: {
    },
    initialize: function(opts) {
        this.collection = opts.collection || [];
        this.listenTo(this.collection, 'add', this.addOne);
        this.listenTo(this.collection, 'remove', this.removeOne);
        this.listenTo(this.collection, 'edit', this.editOne);
        this.childrenViews = {};
        this.ui.list = null;
    },
    /**
     * Creates and renders PersonView instance
     * @param {AppModel} model - the model that was added to the collection and that should be rendered
     */
    addOne: function(model) {
        //A silly workaround to use handlebars condition in this particular template
        if (this.collection.length === 1) {
            this.redraw();
        }

        var view = new PersonView({
            model: model
        }).render();
        //this.childrenViews.push(view);
        this.childrenViews[model.cid] = view;
        this.ui.list.append(view.el);
    },
    /**
     * Will trigger and event for other objects to listen
     * @param {AppModel} model that has to be edited
     */
    editOne: function (model) {
        this.trigger('edit', model.id);
    },
    /**
     * Will remove a corresponding PersonView instance from the DOM
     * @param {AppModel} model which view has to be removed
     */
    removeOne: function(model) {
        //A silly workaround to use handlebars condition in this particular template
        if (this.collection.length === 0) {
            this.redraw();
        }
        var view = this.childrenViews[model.cid];
        if (view) {
            view.remove();
            delete this.childrenViews[model.cid];
        }
    },
    /**
     * Redraws the template and reassigns the ui jQuery objects
     * @returns {PersonListView} self
     */
    redraw: function() {
        this.$el.html(this.template({
            length: this.collection.length
        }));
        this.ui.list = this.$el.find('#app-person-list');
        return this;
    },
    render: function() {
        this.redraw();
        this.collection.each(this.addOne, this);
        return this;
    }
});

/**
 * View that represents person add/edit form
 */
var PersonFormView = Backbone.View.extend({
    template: Handlebars.compile($('#template-person-form').html()),
    ui: {},
    page: 0,
    events: {
        'click #app-person-form-cancel': 'cancel',
        'click #app-person-form-next': 'next',
        'click #app-person-form-back': 'back',
        'click #app-person-form-complete': 'complete',
        'blur input': 'blur'
    },
    initialize: function () {
        this.page = 0;
    },
    /**
     * Change the view's model and re-render its template
     * @param {AppModel} model - new model
     * @returns {PersonFormView} self
     */
    setModel: function(model) {
        this.model = model;
        this.redraw();
        return this;
    },
    /**
     * Clears the model that has been assigned
     * @returns {PersonFormView} self
     */
    clearModel: function() {
        this.model = undefined;
        return this;
    },
    /**
     * Redraws the template and re-assigned the ui jQuery objects
     * @returns {PersonFormView} self
     */
    redraw: function () {
        this.$el.html(this.template(this.model && this.model.toJSON() || {}));
        this.ui.personDetails = this.$('#person-form-person-details');
        this.ui.addressDetails = this.$('#person-form-address-details');
        this.ui.personDetailsError = this.$('#person-form-person-details-error');
        this.ui.addresDetailsError = this.$('#person-form-address-details-error');
        this.ui.inputs = this.$('input');
        return this;
    },
    render: function() {
        switch(this.page) {
            case 0:
                this.ui.personDetails.show();
                this.ui.addressDetails.hide();
                break;
            case 1:
                this.ui.personDetails.hide();
                this.ui.addressDetails.show();
                break;
        }

        //Autofocus
        _.defer(function(self) {
            self.ui.inputs.filter('[autofocus]:visible').focus();
        }, this);

        return this;
    },
    /**
     * Will return the form to the initial page and send an event
     */
    cancel: function() {
        this.page = 0;
        this.render();
        this.trigger('form:cancel', this.page);
    },
    /**
     * Will proceed to the second page of the form
     */
    next: function () {
        //Validate the first part of the form (person attributes, no nested address model)
        if (this.model.isValid({
                nested: false
            })) {
            this.page = 1;
            this.render();
            this.trigger('form:next', this.page);
        }
        else {
            //Trigger 'blur' event to highlight errors on the corresponding fields
            this.ui.inputs.filter(':visible').trigger('blur');
        }
    },
    /**
     * Will get back to the first page of the form, no validation is needed
     */
    back: function() {
        this.page = 0;
        this.render();
        this.trigger('form:back', this.page);
    },
    /**
     * Will save the model
     */
    complete: function () {
        //Highlight the corresponding fields in case of an error
        this.ui.inputs.filter(':visible').trigger('blur');
        //Save the model and handle an error
        var res = this.model.save(),
            self = this;
        if (res) {
            return res.done(function() {
                self.page = 0;
                self.trigger('form:complete', self.model);
                self.render();
            }).fail(function() {
                self.trigger('form:error', res);
            });
        }
        self.trigger('form:error', res);
        self.render();
    },
    /**
     * Blur event handler will validate a field and show a validation error
     * @param e
     */
    blur: function(e) {
        if (!this.model) return;

        var input = e.target;

        //As the model may have nested models, we should find what model we should update
        var attr = input.name,
            attrs = attr.split('.');

        var model = this.model;
        for (var i=0; i<attrs.length-1; i++) {
            //if the attribute name is a model
            if (model.model[attrs[i]]) {
                model = model.attributes[attrs[i]];
                attr = attrs[i+1];
            }
            //else use the name as the attribute name
            else {
                attr = attrs.slice(i-1).join('.');
                break;
            }
        }

        //Set the model attribute and validate it using our own method for model to stay valid at the time
        var res = model.set(attr, input.value).validateAttribute(model.attributes, attr);
        //Render the error message under the input, if there is an error
        this.renderErrorMessage(input, res);
    },

    /**
     * Renders a validation error message under the corresponding field
     * @param {Node} input - DOM object
     * @param {string} message - message to render, if none, then the error will be hidden
     */
    renderErrorMessage: function(input, message) {
        var $input = $(input);
        if (message && typeof(message) === 'string') {
            $input.parents('.form-group').addClass('has-error');
            $input.next().text(message);
        }
        else {
            $input.parents('.form-group').removeClass('has-error');
            $input.next().html('&nbsp;');
        }
    }
});

/**
 * Application view container
 */
var AppView = Backbone.View.extend({
    el: '#app-container',

    template: Handlebars.compile($('#template-app').html()),

    ui: {},
    views: {},
    data: {},

    mode: 'list',

    events: {
        'click #app-add-person': 'add'
    },

    initialize: function() {
        this.$el.html(this.template());
        this.ui.personList = this.$('#app-person-list-view');
        this.ui.personForm = this.$('#app-form-view');
        this.mode = 'list';
    },

    render: function() {
        switch (this.mode) {
            case 'add':
            case 'edit':
                this.ui.personList.hide();
                this.ui.personForm.show();
                break;
            case 'list':
                this.ui.personList.show();
                this.ui.personForm.hide();
                break;
        }
    },

    /**
     * Will start the application and does the initial rendering
     * @param {Router} router object
     * @returns {Promise} promise-like object
     */
    start: function(router) {
        //Save the router instance
        this.router = router;

        //create a collection of people and fetch the data
        this.data.people = new PersonList();

        //fetch the data
        var self = this;
        return this.data.people.fetch().then(function() {
            //create the child views and render them
            self.views.personList = new PersonListView({
                collection: self.data.people
            }).render();
            self.ui.personList.append(self.views.personList.el);
            self.views.personForm = new PersonFormView();
            self.ui.personForm.append(self.views.personForm.el);

            //on form completion and cancel we show the main page again
            self.listenTo(self.views.personForm, 'form:complete', self.list);
            self.listenTo(self.views.personForm, 'form:cancel', self.cancel);

            //on collection edit event we start editing a specific model
            self.listenTo(self.views.personList, 'edit', self.edit);

            //initial rendering
            self.render();
            self.list();
        });
    },

    /**
     * Will call the person form to add a new person
     */
    add: function () {
        this.mode = 'add';
        var person = new Person({
            firstName: '',
            lastName: '',
            address: new Address()
        });
        this.data.people.add(person);
        this.views.personForm.setModel(person).render();
        this.render();
        //Update route
        this.router.navigate('add');
    },

    /**
     * Will call the person form to edit an existing person
     * @param id
     */
    edit: function(id) {
        this.mode = 'edit';
        //In case there is no model found for id we go back to the list page
        var model = this.data.people.get(id);
        if (model === undefined) {
            this.list();
        }
        else {
            //Set an existing model for editing
            this.views.personForm.setModel(this.data.people.get(id)).render();
            this.render();
            //Update route
            this.router.navigate('edit/'+id);
        }
    },

    /**
     * Will show a list of people
     */
    list: function() {
        this.mode = 'list';
        this.render();
        //Update route
        this.router.navigate('');
    },

    /**
     * Will cancel the adding/editing a person and go back to the list of people
     */
    cancel: function() {
        this.views.personForm.clearModel();
        if (this.mode === 'add') {
            this.data.people.pop();
        }
        this.list();
    }
});

/**
 * Application router
 */
var Router = Backbone.Router.extend({
    routes: {
        'add': 'add',
        'edit/:id': 'edit',
        '*foo': 'list'
    },

    list: function() {
        this.app.list();
    },

    edit: function(id) {
        this.app.edit(id);
    },

    add: function () {
        this.app.add();
    },

    /**
     * Start the hash change listener
     * @param {{AppView}} app container
     */
    start: function(app) {
        this.app = app;
        Backbone.history.start();
    }
});

$(function() {
    //Kickstart the app
    var app = new AppView();
    var router = new Router();
    app.start(router).then(function() {
        router.start(app);
    });
});