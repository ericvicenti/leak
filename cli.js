module.exports = function(leak) {
  var leakCli = module.exports = require('commander');
  var promptly = require('promptly');
  var _ = require('./util');

  leakCli
    .version(_.pkg.version)
    .option('-S, --start [name]', 'Start working on a branch, synced with origin, and properly versioned')
    .option('-C, --commit [message]', 'Commit progress on this branch')
    .option('-R, --release [type]', 'Cut a version (of a type like minor or patch), push to master, and close this branch')
    .option('-a --all', 'Commit all files, not only the staged files')
    .option('--clean [do_clean]', 'Clean the feature branch and tags after release? Default [true]', true)
    .option('--clean-remote [do_clean_remote]', 'Clean the remote feature branch and tags after release? Default [true]', true)
    .option('--npm-publish [do_npm_publish]', 'Publish npm module on release? By default, publish if package.json private === false')
    .option('--main-branch [main_branch]', "Specify the 'master' branch which gets released to. Default ['master']", 'master')
    .option('--remote [remote]', "Specify the remote repo to use. 'false' for no remote actions. Default ['origin']", 'origin')
    .parse(process.argv);

  _.each(['clean', 'cleanRemote', 'npmPublish', 'remote'], function(attr) {
    if (leakCli[attr] === 'false') leakCli[attr] = false;
  });

  console.log('--');

  function closeCli(lastMessage) {
    // cosmetic way of closing the cli
    console.log(lastMessage);
    console.log('--');
  }

  _.getRepo().done(function(repo) {

    if (leakCli.start) {

      // === START: ===

      console.log('- Leak start:');

      if (leakCli.release) {
        throw new Error('Cannot start and release at the same time!');
      }

      var branchName = leakCli.start;

      leak.start(branchName, {
        main_branch: leakCli.mainBranch,
        remote: leakCli.remote,
        message: leakCli.commit
      }).progress(function(m) {
        console.log(' - '+m);
      }).done(function() {
        closeCli('- Start "'+branchName+'" done!')
      });

      return; // end start section
    }

    var message = null;

    if (_.isString(leakCli.commit)) {
      message = leakCli.commit;
    }


    if (leakCli.release) {

      // === RELEASE: ===
      console.log('- Leak release: ');

      var releaseType = leakCli.release;
      if (releaseType === true) {
        releaseType = 'patch';
      }
      var validReleaseTypes = [ 'major', 'minor', 'patch', 'prerelease' ];
      if (!_.contains(validReleaseTypes, releaseType)) {
        throw new Error('"'+releaseType+'" is not a valid release type! Must be "major", "minor", "patch", or "prerelease"');
      }

      if (leakCli.all) {
        _.gitStageAll(repo).done(function() {
          console.log(' - Staged all changes');
          goRelease();
        });
      } else {
        goRelease();
      }

      function goRelease() {
        leak.release(releaseType, {
          mainBranch: leakCli.mainBranch,
          remote: leakCli.remote,
          message: message,
          doClean: leakCli.clean,
          doCleanRemote: leakCli.cleanRemote,
          doNpmPublish: leakCli.npmPublish
        }).progress(function(m) {
          console.log(' - '+m);
        }).done(function() {
          closeCli('- Release done!');
        });
      }

    } else {

      // === COMMIT: ===
      console.log('- Leak commit: ');

      if (leakCli.all) {
        _.gitStageAll(repo).done(function() {
          console.log('- Staged all changes');
          goDisplayStatus(message, repo);
        });
      } else {
        goDisplayStatus(message, repo);
      }

      function goDisplayStatus() {
        _.gitStatus(repo).done(function(status) {
          console.log('- Current Git Status: ');
          console.log(status);
          if (_.str.include(status, 'no changes added') || _.str.include(status, 'nothing to commit') || _.str.include(status, 'nothing added to commit')) {
            closeCli('- Nothing staged to commit!');
            return;
          }
          goGetMessage();
        });
      }

      function goGetMessage() {
        if (message) {
          console.log('- Commit Message: '+message);
          goCommitConfirmation(message, repo);
        } else {
          promptly.prompt('~ Commit Message: ', function (err, message) {
            if (err) throw err;
            goCommitConfirmation(message, repo);
          });
        }
      }

      function goCommitConfirmation(message) {
        return _.getBranchName(repo).done(function(branch) {
          var confirmMessage;
          if (leakCli.remote) {
            confirmMessage = '~ Really commit the above to heads/'+branch+' and push to '+leakCli.remote+'?';
          } else {
            confirmMessage = '~ Really commit the above to heads/'+branch+' ?';
          }
          promptly.confirm(confirmMessage + ' (y/n) ', function(err, hasConfirmed) {
            if (err) throw err;
            if (hasConfirmed) goCommit(message, repo);
            else closeCli('- Ok, maybe next time!');
          });
        });
      }

      function goCommit(message) {
        leak.commit({
          main_branch: leakCli.mainBranch,
          remote: leakCli.remote,
          message: message
        }).progress(function(m) {
          console.log(' - '+m);
        }).done(function() {
          closeCli('- Commit Done!');
        });
      }

    }

  });

}