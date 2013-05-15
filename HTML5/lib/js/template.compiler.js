importScripts('handlebars.js', 'ember-handlebars-compiler.js');

self.addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
    case 'start':
      self.postMessage({id: data.id, template: Ember.Handlebars.precompile(data.html)});
      if (data.autoClose) self.close(); // Terminates the worker.
      break;
    case 'stop':
      self.close(); // Terminates the worker.
      break;
    default:
      self.postMessage('Unknown command: ' + data.msg);
  };
}, false);