var MMS = {
  logLevel: 5,
  root: 'http://localhost:8080/api/public/v1.0',
  Models: {},
  Views: {},
  auth: {},
  setAuth: function(username, apiKey) {
    this.auth.username = username;
    this.auth.apiKey = apiKey;
  }
};

var Log = (function() {
  var levels = [ "ERROR", "INFO", "DEBUG" ];
  var log = function(lvl, msg) {
    if (lvl <= MMS.logLevel) {
      console.log(levels[lvl - 1] + " - " + new Date() + " - " + msg);
    }
  };
  var debug = function(msg) {
    log(3, msg);
  };
  var info = function(msg) {
    log(2, msg);
  };
  var error = function(msg) {
    log(1, msg);
  };
  return {
    d: debug,
    i: info,
    e: error
  };
})();

Backbone.ajax = function(options) {
  var digestAuth = new pl.arrowgroup.DigestAuthentication({
    onSuccess: options.success,
    onFailure: options.error,
    username: MMS.auth.username,
    password: MMS.auth.apiKey
  });
  return digestAuth.call(MMS.root + options.url);
};

MMS.Models.Collection = Backbone.Collection.extend({
  parse: function(response) {
    return response.results;
  }
});

MMS.Models.Model = Backbone.Model.extend({
  // for future expansion
});

MMS.Models.Group = MMS.Models.Model;
MMS.Models.Host = MMS.Models.Model;
MMS.Models.Alert = MMS.Models.Model;

MMS.Models.Groups = MMS.Models.Collection.extend({
  model: MMS.Models.Group,
  url: '/groups'
});

MMS.Models.Hosts = MMS.Models.Collection.extend({
  model: MMS.Models.Host,
  constructor: function(attrs, opts) {
    this.group = opts.group;
    MMS.Models.Collection.apply(this, arguments);
  },
  url: function() {
    return this.group.url() + '/hosts';
  }
});

MMS.Models.Alerts = MMS.Models.Collection.extend({
  model: MMS.Models.Alert,
  constructor: function(attrs, opts) {
    this.group = opts.group;
  },
  url: function() {
    return this.group.url() + '/alerts';
  },
  fetchOpen: function(opts) {
    opts.data = { status: "OPEN" };
    return this.fetch(opts);
  }
});

MMS.Views.Group = Backbone.View.extend({
  tagName: 'li',
  template: _.template('<a href="javascript:void(0)"><%= name %></a>'),
  events: {
    'click a': 'showStuff'
  },
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },
  showStuff: function() {
    var hosts = new MMS.Models.Hosts({}, { group: this.model });
    new MMS.Views.HostList({ model: hosts });
    var alerts = new MMS.Models.Alerts({}, { group: this.model });
    new MMS.Views.Alerts({ model: alerts });
  }
});

MMS.Views.GroupList = Backbone.View.extend({
  el: function() {
    return jQuery('#groupList');
  },
  initialize: function() {
    this.listenTo(this.model, 'add', this.addGroup);
    this.model.fetch();
  },
  addGroup: function(group) {
    var groupView = new MMS.Views.Group({ model: group });
    if (this.$('ol').length == 0) {
      this.$el.html('<ol/>');
    }
    this.$('ol').append(groupView.render().el);
  }
});

MMS.Views.Host = Backbone.View.extend({
  tagName: 'li',
  template: _.template('<%= hostname %>:<%= port %> - <%= typeName %>'),
  render: function() {
    Log.d('rendering host');
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  }
});

MMS.Views.HostList = Backbone.View.extend({
  el: function() {
    return jQuery('#hostList');
  },
  initialize: function() {
    var self = this;
    this.listenTo(this.model, 'add', this.addHost);
    this.model.fetch({
      success: function(collection) {
        if (collection.length == 0) {
          self.noHosts();
        }
      }
    });
  },
  addHost: function(host) {
    var hostView = new MMS.Views.Host({ model: host });
    if (this.$('ol').length == 0) {
      this.$el.html('<ol/>');
    }
    this.$('ol').append(hostView.render().el);
  },
  noHosts: function() {
    this.$el.html('No hosts in this group.');
  }
});

MMS.Views.Alerts = Backbone.View.extend({
  el: function() {
    return jQuery('#alerts');
  },
  initialize: function() {
    var self = this;
    this.model.fetchOpen({
      success: function(collection) {
        if (collection.length == 0) {
          self.noAlerts();
        }
        else {
          self.hasAlerts(collection.length);
        }
      }
    });
  },
  noAlerts: function() {
    this.$el.html('Yay! No open alerts.');
  },
  hasAlerts: function(n) {
    this.$el.html('Yikes! You have ' + n + ' open alerts.');
  }
});

jQuery(document).ready(function() {
  jQuery('#authButton').click(function() {
    MMS.setAuth(jQuery('#username').val(), jQuery('#apiKey').val());
    var groups = new MMS.Models.Groups();
    var groupList = new MMS.Views.GroupList({ model: groups });
  });
});
