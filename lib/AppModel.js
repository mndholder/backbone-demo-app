/**
 * The application model class which provides the following features:
 *  - nesting models in its attributes
 *  - ability to save the model with nested models into one entity (via patching toJSON method)
 *  - basic validation declaration
 */
var AppModel = Backbone.Model.extend({
    /**
     * model property is used to define constructor functions of nested modules
     */
    model: {},

    /**
     * validation property is used to define validation rules
     */
    validation: {},

    /**
     * Parse method is used to created nested model classes when necessary
     * @param {Object} response object
     * @returns {Object} response - changed response object
     */
    parse: function (response) {
        //If the attribute in the model property
        for (var key in this.model) if (this.model.hasOwnProperty(key)) {
            if (response[key] !== undefined) {
                //Extract the constructor and create an instance
                response[key] = new this.model[key](response[key], {parse: true});
            }
        }
        return response;
    },

    /**
     * toJSON method is patched to flatten the nested models into their JSON representation
     * @returns {Object} obj - JavaScript object, where all nested models are represented by their attributes only
     */
    toJSON: function () {
        var self = this;
        var obj = _.clone(this.attributes);
        _.each(obj, function (el, key) {
            //If the attribute in the model propery
            if (self.model[key] && self.attributes[key]) {
                //call the nested model toJSON method
                obj[key] = obj[key].toJSON();
            }
        });
        return obj;
    },

    /**
     * Method which allows to validate only one specific attribute
     * @param {Object} attrs - model attributes
     * @param {string} key - name of the attribute to validate
     * @returns {string|undefined} - error message will be returned if the attribute is not valid
     */
    validateAttribute: function (attrs, key) {
        //Validate only if there are validation rules for this attribute
        if (typeof(this.validation === 'object') && this.validation[key]) {
            var required = this.validation[key].required,
                pattern = this.validation[key].pattern,
                value = attrs[key];

            if(pattern && !(pattern instanceof RegExp)) pattern = new RegExp(pattern.toString());

            //Check the required attribute
            if (required && value !== 0 && !value) {
                return this.validation[key].message || ('The field "' + key + '" is required');
            }
            else {
                //Check the regular expression pattern
                if (value && pattern && !pattern.test(value)) {
                    return this.validation[key].message || ('The field "' + key + '" is not valid');
                }
            }
        }
    },

    /**
     * Validation logid
     * @param {Object} attrs - model attributes
     * @param {Object} options - validation options
     * @returns {string|undefined} - error message will be returned if the attribute is not valid
     */
    validate: function (attrs, options) {
        options = options || {};

        //If 'nested' flag is false, then the model's nested models won't be checked
        options.nested = options.nested === undefined ? true : options.nested;

        //If 'only' attribute is present, we check only one specific attribute
        if (typeof options.only === 'string') {
            return this.validateAttribute(attrs, options.only);
        }
        else {
            //Checking the nested models
            for (var key in attrs) if (attrs.hasOwnProperty(key)) {
                if (this.model[key] && options.nested && !this.attributes[key].isValid(options)) {
                    return this.attributes[key].validationError;
                }
                else {
                    //This will return on the first error met
                    var res = this.validateAttribute(attrs, key);
                    if (res) {
                        return res;
                    }
                }
            }
        }
    }
});