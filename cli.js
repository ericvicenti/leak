module.exports = function(leak) {
  var leakCli = module.exports = require('commander');
  var promptly = require('promptly');
  var _ = require('./util');

  leakCli
    .version(_.pkg.version)
    .option('-S, --start [name]', 'Start working on a branch, synced with origin, and properly versioned')
    .option('-C, --commit [message]', 'Commit progress on this branch')
    .option('-R, --release [type]', 'Cut a version (of a type like minor or patch), push to master, and close this branch')
    .option('--clean [do_clean]', 'Clean the feature branch and tags after release? Default [true]', true)
    .option('--clean-remote [do_clean_remote]', 'Clean the remote feature branch and tags after release? Default [true]', true)
    .option('--npm-publish [do_npm_publish]', 'Publish npm module on release? By default, publish if package.json private === false')
    .option('--main-branch [main_branch]', "Specify the 'master' branch which gets released to. Default ['master']", 'master')
    .option('--remote [remote]', "Specify the remote repo to use. 'false' for no remote actions. Default ['origin']", 'origin')
    .parse(process.argv);

  if (leakCli.start) {
    if (leakCli.commit) {
      throw new Error('Cannot start and commit at the same time!');
    }
    if (leakCli.release) {
      throw new Error('Cannot start and release at the same time!');
    }

    action = 'start';

    var branchName = leakCli.start;

    console.log('LEAK STARTING "'+ branchName + '" ...');

    leak.start(branchName, {
      main_branch: leakCli.main_branch,
      remote: leakCli.remote
    }).progress(function(m) {
      console.log('LEAK:', m);
    }).done(function() {
      console.log('LEAK START "'+branchName+'" DONE!');
    });

    return; // end start section
  }

  var action = 'commit'; // commit is the default action
  var message = null;

  if (_.isString(leakCli.commit)) {
    message = leakCli.commit;
  }

  if (leakCli.release) {
    var releaseType = leakCli.release;
    if (releaseType === true) {
      releaseType = 'patch';
    }
    var validReleaseTypes = [ 'major', 'minor', 'patch', 'prerelease' ];
    if (!_.contains(validReleaseTypes, releaseType)) {
      throw new Error('"'+releaseType+'" is not a valid release type! Must be "major", "minor", "patch", or "prerelease"');
    }

    console.log('LEAK RELEASING '+releaseType);

    leak.release(null, releaseType, message).progress(function(m) {
      console.log('LEAK:', m);
    }).done(function() {
      console.log('LEAK RELEASE '+releaseType+' DONE!');
    });

  } else {

    console.log('LEAK COMMITTING '+message);

    leak.commit(null, message).progress(function(m) {
      console.log('LEAK:', m);
    }).done(function() {
      console.log('LEAK COMMIT DONE!');
    });
  }

}