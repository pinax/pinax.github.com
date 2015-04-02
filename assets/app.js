var Pinax = Pinax || {};

(function ($, undefined) {
  Pinax.addRecentlyUpdatedRepo = function (repo) {
    var $item = $("<li>");

    var $name = $("<a>").attr("href", repo.html_url).text(repo.name);
    $item.append($("<span>").addClass("name").append($name));

    var $time = $("<a>").attr("href", repo.html_url + "/commits").text(strftime("%h %e, %Y", repo.pushed_at));
    $item.append($("<span>").addClass("time").append($time));

    $item.append('<span class="bullet">&sdot;</span>');

    var $watchers = $("<a>").attr("href", repo.html_url + "/watchers").text(repo.watchers + " watchers");
    $item.append($("<span>").addClass("watchers").append($watchers));

    $item.append('<span class="bullet">&sdot;</span>');

    var $forks = $("<a>").attr("href", repo.html_url + "/network").text(repo.forks + " forks");
    $item.append($("<span>").addClass("forks").append($forks));

    $item.appendTo("#recently-updated-repos");
  };

  Pinax.travisBadge = function (org, project) {
    var $img = $("<img>").attr("src", "https://img.shields.io/travis/" + org + "/" + project + ".svg"),
        $link = $("<a>").attr("class", "badge-link").attr("href", "https://travis-ci.org/" + org + "/" + project).append($img);
    return $link;
  };

  Pinax.coverallsBadge = function (org, project) {
    var $img = $("<img>").attr("src", "https://img.shields.io/coveralls/" + org + "/" + project + ".svg"),
        $link = $("<a>").attr("class", "badge-link").attr("href", "https://coveralls.io/r/" + org + "/" + project).append($img);
    return $link;
  };

  Pinax.pypiBadge = function (org, project) {
    var $img = $("<img>").attr("src", "https://img.shields.io/pypi/v/" + project + ".svg"),
        $link = $("<a>").attr("class", "badge-link").attr("href", "https://pypi.python.org/pypi/" + project).append($img);
    return $link;
  };

  Pinax.addRepo = function (repo, opts) {
    if (opts.target) {
      var $item = $("<li>").addClass("repo grid-1");
      var $link = $("<a>").attr("href", repo.html_url).appendTo($item);
      if (repo.fork) {
        $link.append($('<h2 class="fork">').text(repo.name));
      } else {
        $link.append($("<h2>").text(repo.name));
      }
      $link.append($("<p>").text(repo.description));
      if (opts.badges) {
        $item.append(Pinax.travisBadge(repo.owner.login, repo.name));
        if (repo.name !== "eldarion-ajax") {
          $item.append(Pinax.coverallsBadge(repo.owner.login, repo.name));
          $item.append(Pinax.pypiBadge(repo.owner.login, repo.name));
        }
      }
      $item.appendTo(opts.target);
    }
  };

  Pinax.addRepos = function(org, repos, page) {
    repos = repos || [];
    page = page || 1;

    var uri = "https://api.github.com/orgs/" + org + "/repos?callback=?" + "&per_page=100" + "&page=" + page;
    $.getJSON(uri, function (result) {
      if (result.data.message) {
        console.log(result.data.message);
        console.log("\tIt will be reset at", new Date(result.meta["X-RateLimit-Reset"] * 1000));
      }
      if (result.data && result.data.length > 0) {
        $.each(result.data, function(i, repo) {
          if (Pinax.Repositories[org + "/" + repo.name]) {
            repos.push(repo);
          }
      });
        Pinax.addRepos(org, repos, page + 1);
      }
      else {
        $.each(repos, function (i, repo) {
          repo.pushed_at = new Date(repo.pushed_at);

          var weekHalfLife  = 1.146 * Math.pow(10, -9);

          var pushDelta    = (new Date()) - Date.parse(repo.pushed_at);
          var createdDelta = (new Date()) - Date.parse(repo.created_at);

          var weightForPush = 1;
          var weightForWatchers = 1.314 * Math.pow(10, 7);

          repo.hotness = weightForPush * Math.pow(Math.E, -1 * weekHalfLife * pushDelta);
          repo.hotness += weightForWatchers * repo.watchers / createdDelta;
        });

        // Sort by highest # of watchers.
        repos.sort(function (a, b) {
          if (a.hotness < b.hotness) return 1;
          if (b.hotness < a.hotness) return -1;
          return 0;
        });

        $.each(repos, function (i, repo) {
            Pinax.addRepo(repo, Pinax.Repositories[org + "/" + repo.name]);
        });

        // Sort by most-recently pushed to.
        repos.sort(function (a, b) {
          if (a.pushed_at < b.pushed_at) return 1;
          if (b.pushed_at < a.pushed_at) return -1;
          return 0;
        });

        $.each(repos.slice(0, 6), function (i, repo) {
          console.log("Adding", i, repo);
          Pinax.addRecentlyUpdatedRepo(repo);
        });
      }
    });
  };
})(jQuery);
