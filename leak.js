#!/usr/bin/env node
var _ = require('./util');

var leak = module.exports = {};

leak.start = function leakStart(branchName, opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      main_branch: ,
      message:
    }
  */
  opts = opts || {};

  var doLeakStart = _.Q.defer();
  var notify = doLeakStart.notify;

  _.getRepo(opts.repo).then(function(repo) {
    return _.getBranchName(repo).then(function(currentBranch) {

      notify('Using repo: '+repo);
      return _.gitCheckout(repo, branchName).then(function() {
        notify('Checked out '+branchName);
        return _.gitPull(repo, opts.remote, branchName).then(function() {
          notify('Pulled '+branchName+' from '+opts.remote+'.');
        }, function(e) {
          e = ''+e;
          if (_.str.include(e, 'Couldn\'t find remote ref')) {
            notify('Remote branch "'+branchName+'" does not exist!');
            return setBranchVersionAndPublish(repo);
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
              return setBranchVersionAndPublish();

            } else {
              throw new Error('Unexpected error checking out:' + e);
            }
            notify('Could not track "'+opts.remote+'/'+branchName+'"')
          });
        });
      }

      function setBranchVersionAndPublish() {
        return _.versionSetBranch(repo, branchName).then(function(newVersion) {
          notify('Set version to "'+newVersion+'"');
          return _.packageJsonStage(repo).then(function() {
            notify('Package.json staged.');
            var message = opts.message;
            if (message) {
              return publishVersion(newVersion, message);
            } else {
              notify('Current branch is '+currentBranch);
              message = 'starting '+branchName+' from '+currentBranch;
              return publishVersion(newVersion, message);
            }
          });
        }, function(e) {
          e = ''+e;
          if (_.str.include(e, 'duplicate version')) {
            return _.versionGet(repo).then(function(dupeVersion) {
              pushVersion(dupeVersion);
            });
          } else {
            throw new Error(e);
          }
        });
      }

      function publishVersion(version, message) {
        return _.gitCommit(repo, message).then(function() {
          notify('Committed "'+message+'" ('+version+') to "'+branchName+'"');
          return _.makeTag(repo, version).then(function() {
            notify('Tagged "'+version+'"');
            return pushVersion(version);
          });
        });
      }

      function pushVersion(version) {
        return _.gitPush(repo, opts.remote, branchName).then(function() {
          notify('Pushed to "'+opts.remote+'/'+branchName+'"');
          return _.gitPushTag(repo, opts.remote, version).then(function() {
            notify('Pushed tag "'+version+'" to "'+opts.remote+'"');
            return;
          });
        });
      }

    });

  }).then(doLeakStart.resolve, doLeakStart.reject);

  return doLeakStart.promise;
}

leak.commit = function leakCommit(opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      main_branch: ,
      message:
    }
  */

  opts = opts || {};

  var doLeakCommit = _.Q.defer();
  var notify = doLeakCommit.notify;

  _.getRepo(opts.repo).then(function(repo) {
    return _.getBranchName(repo).then(function(branch) {
      notify('Will commit '+repo+' on '+branch );
      return _.gitPull(repo, opts.remote, branch).then(function() {
        notify('Done with git pull');
        return _.versionIncr(repo, 'prerelease').then(function(version) {
          notify('Incremented to '+version );
          return _.packageJsonStage(repo).then(function() {
            notify('Staged package.json');
            return commitTagPush(repo, branch, version);
          });
        });
      });
    });
  }).then(doLeakCommit.resolve, doLeakCommit.reject);

  function commitTagPush(repo, branch, version) {
    var message = opts.message ? opts.message : version;
    return _.gitCommit(repo, message).then(function() {
      notify('Committed "'+message+'" ('+version+') to "'+branch+'"');
      return _.makeTag(repo, version).then(function() {
        notify('Tagged "'+version+'"');
        return _.gitPush(repo, opts.remote, branch).then(function() {
          notify('Pushed to "'+opts.remote+'/'+branch+'"');
          return _.gitPushTag(repo, opts.remote, version).then(function() {
            notify('Pushed tag "'+version+'" to "'+opts.remote+'"');
            return;
          });
        });
      });
    });
  }


  return doLeakCommit.promise;
}

leak.release = function leakRelease(type, opts) {
  /*
    opts: {
      repo: repo path,
      remote: ,
      mainBranch: ,
      clean: bool.
      cleanRemote:
      npmPublish
    }
  */

  opts = opts || {};

  var doLeakRelease = _.Q.defer();
  var notify = doLeakRelease.notify;

  _.getRepo(opts.repo).then(function(repo) {
    return _.getBranchName(repo).then(function(branch) {
      notify('Releasing '+branch+' of '+repo );
      return _.gitPull(repo, opts.remote, branch).then(function() {
        notify('Done with git pull '+opts.remote+' '+branch);
        if (branch == opts.mainBranch) {
          return releaseVersion(repo, branch);
        } else {
          return _.gitPull(repo, opts.remote, opts.mainBranch).then(function() {
            return releaseVersion(repo, branch);
          });
        }
      });
    });
  }).then(doLeakRelease.resolve, doLeakRelease.reject);

  function releaseVersion(repo, branch) {
    return _.versionIncr(repo, type).then(function(version) {
      notify('Incremented to '+version);
      return _.packageJsonStage(repo).then(function() {
        notify('Staged package.json');
        return commitTagPush(repo, branch, version);
      });
    });
  }

  function commitTagPush(repo, branch, version) {
    var message = opts.message ? opts.message : type+' release '+version;
    return _.gitCommit(repo, message).then(function() {
      notify('Committed "'+message+'" ('+version+') to "'+branch+'"');
      return _.makeTag(repo, version).then(function() {
        notify('Tagged "'+version+'"');
        return _.gitPush(repo, opts.remote, branch).then(function() {
          notify('Pushed to "'+opts.remote+'/'+branch+'"');
          return _.gitPushTag(repo, opts.remote, version).then(function() {
            notify('Pushed tag "'+version+'" to "'+opts.remote+'"');
            if (branch == opts.mainBranch) {
              return npmPublish(repo);
            } else {
              return branchMerge(repo, branch, version);
            }
          });
        });
      });
    });
  }

  function branchMerge(repo, branch, version) {
    return _.gitPush(repo, opts.remote, branch, opts.mainBranch).then(function() {
      notify('Pushed branch "'+branch+'" to "'+opts.remote+' '+opts.mainBranch+'"');
      return branchClean(repo, branch, version);
    });
  }

  function branchClean(repo, branch, version) {
    console.log("ASDC ", opts);
    if (opts.clean) {
      console.log('aa')
      if (opts.cleanRemote) {
      console.log('bb')

        return goBranchCleanRemote(repo, branch, version);
      } else {
      console.log('cc')

        return goBranchClean(repo, branch, version)
      }
    } else {
      return prepareNpmPublish(repo);
    }
  }

  function goBranchCleanRemote(repo, branch, version) {
    console.log('cleaning remote!')
    return goBranchClean(repo, branch, version);
  }

  function goBranchClean(repo, branch, version) {
    return _.deleteBranchTags(repo, branch).then(function(tags) {
      notify('Removed '+tags.length+' tags with "'+branch+'" label.')
      return _.deleteBranch(repo, branch).then(function() {
        notify('Removed branch "'+branch+'"');
        return prepareNpmPublish(repo);
      });
    })
  }

  function prepareNpmPublish(repo) {
    if (_.isUndefined(opts.npmPublish)) {
      _.packageJsonGet(repo).done(function(packageJson) {
        if (packageJson['private'] === false) goNpmPublish(repo);
      });
    } else if(opts.npmPublish) {
      goNpmPublish(repo);
    }
  }

  function goNpmPublish(repo) {
    notify('would publish to npm!')
  }

  return doLeakRelease.promise;
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