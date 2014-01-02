#!/usr/bin/env node
var _ = require('./util');

var leak = module.exports = {};

leak.start = function leakStart(branchName, opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      main_branch: ,
    }
  */
  opts = opts || {};

  var doLeakStart = _.Q.defer();
  var notify = doLeakStart.notify;

  _.getRepo(opts.repo).then(function(repo) {

    notify('Using repo: '+repo);
    return _.gitCheckout(repo, branchName).then(function() {
      notify('Checked out '+branchName);
      return _.gitPull(repo, opts.remote, branchName).then(function() {
        notify('Pulled '+branchName+' from '+opts.remote+'.');
      }, function(e) {
        e = ''+e;
        if (_.str.include(e, 'Couldn\'t find remote ref')) {
          notify('Remote branch "'+branchName+'" does not exist!');
          return setBranchVersion(repo);
        } else {
          throw new Error('Unexpected git pull error:' + e);
        }
      });
    }, function(e) {
      e = ''+e;
      if (_.str.include(e, 'pathspec') && _.str.include(e, 'did not match')) {
        notify('Could not check out "'+branchName+'"');
        return newBranch(repo);
      } else {
        throw new Error('Unexpected error checking out:' + e);
      }
    });

    function newBranch() {
      return _.gitNewBranch(repo, branchName).then(function() {
        notify('Created new branch "'+branchName+'"');
        return _.gitSetBranchTracking(repo, opts.remote, branchName).then(function() {
          notify('Branch now tracking "'+opts.remote+'/'+branchName+'"');
          return _.gitPull(repo, opts.remote, branchName);
        }, function(e) {
          e = ''+e;
          if (_.str.include(e, 'does not exist')) {
            notify('Could not track "'+opts.remote+'/'+branchName+'".');
            return setBranchVersion();

          } else {
            throw new Error('Unexpected error checking out:' + e);
          }
          notify('Could not track "'+opts.remote+'/'+branchName+'"')
        });
      });
    }

    function setBranchVersion() {
      return _.versionSetBranch(repo, branchName).then(function(newVersion) {
        notify('Set version to "'+newVersion+'"');
        _.packageJsonStage(repo).then(function() {
          notify('Package.json staged.');
          return commit(opts.message);
        });
      });
    }

    function commit(message) {
      return _.gitCommit(repo, message).then(function() {
        notify('Committed to "'+branchName+'"');
        return publishBranch();
      });
    }

    function publishBranch() {
      return _.gitPush(repo, opts.remote, branchName).then(function() {
        notify('Pushed to "'+opts.remote+'/'+branchName+'"');
      });
    }

  }).then(doLeakStart.resolve, doLeakStart.reject);

  return doLeakStart.promise;
}

leak.commit = function leakCommit(message, opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      main_branch: ,
    }
  */
  opts = opts || {};

  return _.getRepo(opts.repo);
}

leak.release = function leakRelease(type, opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      main_branch: ,
    }
  */
  opts = opts || {};

  return _.getRepo(opts.repo);
}

if (require.main === module) {
  // leak is being run as the "main" module

  // invoke cli
  require('./cli')(leak);
}

// _.getRepo().done(function(repo) {
//   _.getRepoName(repo).done(function(repoName) {
//     _.getBranchName(repo).done(function(branch) {
//       promptly.confirm('Commit "'+message+'" to '+branch+' on '+repoName+'?', function (err, value) {
//         if (err || !value) {
//           console.log('Leak cancelled');
//           return;
//         }
//         var remote = 'origin';
//         var branch = 'master';
//         console.log('Checking if push is OK');
//         // _.checkPush(repo, remote, branch).then(function(a) {
//         //   console.log('aaah ', a)
//         // }, function(f) {
//         //   console.log('Error! Cannot push to branch "'+branch+'" at remote "'+remote+'"');
//         // });
//       });
//     });
//   });
// });