#!/usr/bin/env node

var program = require('commander');
var promptly = require('promptly');
var _ = require('./util');

var action = 'nominate';
var type = 'prerelease';

program
  .version('0.0.1')
  .option('-C, --commit [type]', 'Nominate a specific release type')
  .option('-m, --message [message]', 'Commit message')
  .parse(process.argv);


if (program.commit) {
  type = program.commit;
}

if (action == 'nominate') {
  var message = program.message;
  if (!message) {
    message = '' + type + ' leaked';
  }
  _.getRepo().done(function(repo) {
    _.getRepoName(repo).done(function(repoName) {

      _.getBranchName(repo).done(function(branch) {

        promptly.confirm('Commit "'+message+'" to '+branch+' on '+repoName+'?', function (err, value) {
          if (err || !value) {
            console.log('Leak cancelled');
            return;
          }

          var remote = 'origin';
          var branch = 'master';

          console.log('Checking if push is OK');

          _.checkPush(repo, remote, branch).then(function(a) {
            console.log('aaah ', a)
          }, function(f) {
            console.log('Error! Cannot push to branch "'+branch+'" at remote "'+remote+'"');
          });

        });
      });
    });
  });

}
