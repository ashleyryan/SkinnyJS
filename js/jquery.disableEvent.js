// ## jQuery.disableEvent
// This plugin allows temporary disabling/enabling of all event handlers for a specific event type and element.

// ### Usage
// To disable an event for a link:

//     $(".disabled-link").disableEvent("click");

// Click handlers set with jQuery will no longer fire.
// These event handlers can be re-enabled:

//     $(".disabled-link").enableEvent("click");

// These methods take any number of space-delimited event names:

//     $(".disabled-link").disableEvent("click touchstart touchdown mousedown");

// ### Source

(function($)
{
    // Ensures that a data object is associated with a jQuery object
    // If an object already exists, return it. If not, store and return the default object.
    function ensureData($el, key, defaultObject)
    {
        var data = $el.data(key);
        if (typeof data == "undefined")
        {
            data = defaultObject || {};
            $el.data(key, data);
        }

        return data;
    }

    // Takes a space-delimited event type string and returns an array of individual event types.
    function parseEventTypes(types) 
    { 
        return $.trim(types).split(" "); // TODO: hoverHack in jQuery does something else here...
    }

    // Returns true if the specified event has been disabled
    $.fn.isEventDisabled = function(eventType)
    {
        return eventType in (this.data("eventsDisabled") || {});
    };

    var _initialized = false;
    var _originalAddEvent;

    // Lazily initialize. Pages that don't use this plugin shouldn't
    // pay the overhead to monkey patch $.event.add().
    function initialize()
    {
        if (_initialized)
        {
            return;
        }

        _initialized = true;

        _originalAddEvent = $.event.add;
        $.event.add = addEvent;
    }

    // Monkey patched version of $.event.add
    var addEvent = function(elem, types, handler, data, selector)
    {
        var eventsDisabled = $(elem).data("eventsDisabled");
        if (eventsDisabled)
        {
            var eventTypes = parseEventTypes(types);
            for (var i=eventTypes.length-1; i>=0; i--) // loop backward- we need to remove elements from the array
            {
                var eventType = eventTypes[i];

                var disabledHandlers = eventsDisabled[eventType];
                if (disabledHandlers)
                {
                    // This event type is disabled. Store the handler, and prevent it from being assigned via jQuery.

                    // $.event.add's handler argument may be a handler object
                    if (handler.handler)
                    {
                        disabledHandlers.push(handler);
                    }
                    else
                    {
                        disabledHandlers.push({ handler: handler, data: data, selector: selector, type: eventType });
                    }

                    // Handlers for this event type have been cached. Remove them so jQuery doesn't assign them.
                    eventTypes.splice(i, 1);
                }
            }

            // Reconstruct the space-delimited "types" string.
            types = $.trim(eventTypes.join(" "));
            if (!types)
            {
                return;
            }
        }

        _originalAddEvent.call(this, elem, types, handler, data, selector);
    };

    // Disables all handlers for the specified event type(s) on the element
    // Handlers added after this is called will be cached, but not actually added
    $.fn.disableEvent = function(eventType)
    {
        initialize();

        // event types can be a space-delimited string (i.e. "click mouseup")
        var eventTypes = parseEventTypes(eventType);

        // Handle all jQuery elements
        this.each(function(i, el) 
        {
            var $el = $(el);

            // jQuery stores event handlers in an object associated with the element
            var events = $el.data("events");
            if (events)
            {
                $.each(eventTypes, function(i, eventType)
                {
                    // See if there are handlers for this particular event type
                    var handlers = events[eventType];
                    if (handlers)
                    {
                        // Clone the array. When we call $.fn.off(), it will modify the array and mess up iteration.
                        handlers = handlers.slice(0);

                        var eventsDisabled = ensureData($el, "eventsDisabled");

                        //console.log("disable: " + eventType);
                        //console.log($el[0]);

                        // There are already some handlers disabled. Add them to the existing list.
                        var disabledHandlers = eventsDisabled[eventType];
                        if (!disabledHandlers)
                        {
                            disabledHandlers = [];
                            eventsDisabled[eventType] = disabledHandlers;
                        }

                        for (var j=0; j<handlers.length; j++)
                        {
                            disabledHandlers.push(handlers[j]);
                            $el.off(eventType, handlers[j].handler);
                        }
                    }
                });
            }
        });
    };

    // Re-enables events disabled via $.fn.disableEvent
    $.fn.enableEvent = function(eventType, enable)
    {
        if (typeof enable != "undefined")
        {
            if (!enable)
            {
                this.disableEvent(eventType);
                return;
            }
        }

        this.each(function(i, el) 
        {
            var $el = $(el);
            var eventsDisabled = $el.data("eventsDisabled");
            if (eventsDisabled)
            {
                var eventTypes = parseEventTypes(eventType);
                $.each(eventTypes, function(i, eventType)
                {
                    var handlers = eventsDisabled[eventType];
                    if (handlers)
                    {
                        $.each(handlers, function(j, handler)
                        {
                            _originalAddEvent($el[0], eventType, handler);
                        });

                        delete eventsDisabled[eventType];
                    }
                });
            }
        });
    };

})(jQuery);